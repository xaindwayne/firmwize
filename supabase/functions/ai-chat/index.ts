import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DocumentSource {
  id: string;
  title: string;
  department: string | null;
  knowledge_type: string | null;
  relevance: number;
  excerpt: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, conversationId } = await req.json() as { 
      messages: ChatMessage[]; 
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userQuestion = messages[messages.length - 1]?.content || "";

    // Fetch approved documents for context
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, department, knowledge_type, content_text, questions_answered, notes")
      .eq("user_id", user.id)
      .eq("document_status", "approved")
      .eq("ai_enabled", true)
      .not("content_text", "is", null);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
    }

    // Simple keyword matching for relevant documents
    const relevantDocs: DocumentSource[] = [];
    const questionWords = userQuestion.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const searchText = `${doc.title} ${doc.content_text || ""} ${doc.questions_answered || ""} ${doc.notes || ""}`.toLowerCase();
        let matchScore = 0;
        
        for (const word of questionWords) {
          if (searchText.includes(word)) {
            matchScore++;
          }
        }
        
        if (matchScore > 0) {
          // Extract relevant excerpt
          const contentText = doc.content_text || "";
          let excerpt = "";
          for (const word of questionWords) {
            const idx = contentText.toLowerCase().indexOf(word);
            if (idx !== -1) {
              const start = Math.max(0, idx - 100);
              const end = Math.min(contentText.length, idx + 200);
              excerpt = contentText.slice(start, end);
              break;
            }
          }
          
          relevantDocs.push({
            id: doc.id,
            title: doc.title,
            department: doc.department,
            knowledge_type: doc.knowledge_type,
            relevance: matchScore,
            excerpt: excerpt || contentText.slice(0, 300),
          });
        }
      }
      
      // Sort by relevance
      relevantDocs.sort((a, b) => b.relevance - a.relevance);
    }

    // Get company settings
    const { data: settings } = await supabase
      .from("company_settings")
      .select("show_sources_in_answers, refuse_without_sources, company_name")
      .eq("user_id", user.id)
      .single();

    const showSources = settings?.show_sources_in_answers ?? true;
    const refuseWithoutSources = settings?.refuse_without_sources ?? true;
    const companyName = settings?.company_name || "your organization";

    // Build context from relevant documents
    const topDocs = relevantDocs.slice(0, 5);
    let documentContext = "";
    
    if (topDocs.length > 0) {
      documentContext = "\n\n## Approved Knowledge Base Documents:\n\n";
      for (const doc of topDocs) {
        documentContext += `### Document: "${doc.title}"\n`;
        documentContext += `Department: ${doc.department || "General"}\n`;
        documentContext += `Type: ${doc.knowledge_type || "General"}\n`;
        documentContext += `Content excerpt:\n${doc.excerpt}\n\n---\n\n`;
      }
    }

    // Build system prompt
    const systemPrompt = `You are an internal AI knowledge assistant for ${companyName}. Your role is to help employees find accurate information from the organization's approved knowledge base.

## Critical Rules:
1. ONLY provide answers based on the approved internal documents provided below.
2. NEVER make up information or provide answers not grounded in the provided documents.
3. If no relevant approved source exists for a question:
   - Explicitly state: "I couldn't find approved internal documentation on this topic."
   - Ask clarifying questions to better understand what the user needs
   - Suggest related topics or documents if available
   - Offer the "Request Knowledge" action so they can request this information be added

4. ${showSources ? "Always cite your sources by mentioning the document title(s) you used." : "Provide helpful answers without explicitly citing sources."}
5. ${refuseWithoutSources ? "If you cannot find a relevant source, do NOT attempt to answer from general knowledge." : "You may provide general guidance while noting it's not from the internal knowledge base."}

6. Be professional, helpful, and concise.
7. If a question is unclear, ask for clarification.
8. For sensitive topics, recommend speaking with the appropriate department.

${documentContext || "\n## Note: No approved documents are currently available in the knowledge base.\n"}`;

    // Check if we should refuse without sources
    if (refuseWithoutSources && topDocs.length === 0) {
      const noSourceResponse = {
        content: `I couldn't find any approved internal documentation that addresses your question about "${userQuestion}".

**What you can do:**
- Try rephrasing your question with different keywords
- Check if this topic falls under a specific department
- Use the **"Request Knowledge"** button to submit a request for this information to be added to the knowledge base

Would you like me to help you with something else, or would you like to submit a knowledge request?`,
        sources: [],
        hasNoSource: true,
      };
      
      // Log unanswered question for gap analysis
      await supabase.from("unanswered_questions").insert({
        user_id: user.id,
        question: userQuestion,
      });

      return new Response(
        JSON.stringify(noSourceResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    // Prepare sources for response
    const sourcesForResponse = showSources && topDocs.length > 0
      ? topDocs.map(d => ({
          id: d.id,
          title: d.title,
          department: d.department,
          type: d.knowledge_type,
        }))
      : [];

    // Log if no sources were found (for gap analysis)
    if (topDocs.length === 0) {
      await supabase.from("unanswered_questions").insert({
        user_id: user.id,
        question: userQuestion,
      });
    }

    // Save messages to conversation if conversationId provided
    if (conversationId) {
      await supabase.from("chat_messages").insert([
        {
          conversation_id: conversationId,
          role: "user",
          content: userQuestion,
        },
        {
          conversation_id: conversationId,
          role: "assistant",
          content: assistantMessage,
          sources: sourcesForResponse.length > 0 ? sourcesForResponse : null,
        },
      ]);
    }

    return new Response(
      JSON.stringify({
        content: assistantMessage,
        sources: sourcesForResponse,
        hasNoSource: topDocs.length === 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});