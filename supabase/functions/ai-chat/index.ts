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
  section?: string;
}

// Simple tokenizer for semantic matching
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// Calculate semantic similarity using TF-IDF-like scoring
function calculateRelevance(query: string, document: string, title: string): { score: number; excerpt: string; section: string } {
  const queryTokens = tokenize(query);
  const docTokens = tokenize(document);
  const titleTokens = tokenize(title);
  
  if (queryTokens.length === 0 || docTokens.length === 0) {
    return { score: 0, excerpt: '', section: '' };
  }

  // Build term frequency map for document
  const docTF: Record<string, number> = {};
  for (const token of docTokens) {
    docTF[token] = (docTF[token] || 0) + 1;
  }

  // Calculate relevance score
  let score = 0;
  let matchedTerms: string[] = [];
  
  for (const queryToken of queryTokens) {
    // Exact match
    if (docTF[queryToken]) {
      score += Math.log(1 + docTF[queryToken]) * 2;
      matchedTerms.push(queryToken);
    }
    
    // Partial match (substring)
    for (const docToken of Object.keys(docTF)) {
      if (docToken.includes(queryToken) || queryToken.includes(docToken)) {
        if (docToken !== queryToken) {
          score += Math.log(1 + docTF[docToken]) * 0.5;
          matchedTerms.push(docToken);
        }
      }
    }
    
    // Title match bonus
    if (titleTokens.includes(queryToken)) {
      score += 5;
    }
  }

  // Normalize by query length
  score = score / Math.sqrt(queryTokens.length);

  // Find best excerpt around matched terms
  let bestExcerpt = '';
  let bestSection = '';
  
  if (matchedTerms.length > 0) {
    const docLower = document.toLowerCase();
    let bestPos = -1;
    let maxMatches = 0;

    // Find position with most matches nearby
    for (let i = 0; i < docLower.length; i += 100) {
      const window = docLower.slice(i, i + 500);
      let matches = 0;
      for (const term of matchedTerms) {
        if (window.includes(term)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestPos = i;
      }
    }

    if (bestPos >= 0) {
      const start = Math.max(0, bestPos - 50);
      const end = Math.min(document.length, bestPos + 450);
      bestExcerpt = document.slice(start, end).trim();
      
      // Try to identify section
      const beforeText = document.slice(Math.max(0, bestPos - 200), bestPos);
      const sectionMatch = beforeText.match(/(?:^|\n)([A-Z][^:\n]{3,50}):?\s*$/);
      if (sectionMatch) {
        bestSection = sectionMatch[1].trim();
      }
    }
  }

  if (!bestExcerpt && document.length > 0) {
    bestExcerpt = document.slice(0, 400).trim();
  }

  return { score, excerpt: bestExcerpt, section: bestSection };
}

// Semantic search across documents
function semanticSearch(query: string, documents: any[]): DocumentSource[] {
  const results: DocumentSource[] = [];

  for (const doc of documents) {
    const searchableText = `${doc.title || ''} ${doc.content_text || ''} ${doc.questions_answered || ''} ${doc.notes || ''}`;
    const { score, excerpt, section } = calculateRelevance(query, searchableText, doc.title || '');

    if (score > 0.5) { // Minimum relevance threshold
      results.push({
        id: doc.id,
        title: doc.title,
        department: doc.department,
        knowledge_type: doc.knowledge_type,
        relevance: score,
        excerpt,
        section,
      });
    }
  }

  // Sort by relevance and take top results
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log(`Processing question: "${userQuestion.slice(0, 100)}..."`);

    // Fetch all approved documents for semantic search
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, department, knowledge_type, content_text, questions_answered, notes, chunk_count")
      .eq("user_id", user.id)
      .eq("document_status", "approved")
      .eq("ai_enabled", true)
      .eq("processing_status", "completed")
      .not("content_text", "is", null);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
    }

    console.log(`Found ${documents?.length || 0} approved documents for search`);

    // Perform semantic search
    const relevantDocs = documents && documents.length > 0 
      ? semanticSearch(userQuestion, documents)
      : [];

    console.log(`Semantic search found ${relevantDocs.length} relevant documents`);

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
    let documentContext = "";
    
    if (relevantDocs.length > 0) {
      documentContext = "\n\n## Relevant Knowledge Base Documents:\n\n";
      for (const doc of relevantDocs) {
        documentContext += `### Document: "${doc.title}"\n`;
        documentContext += `- Department: ${doc.department || "General"}\n`;
        documentContext += `- Type: ${doc.knowledge_type || "General"}\n`;
        if (doc.section) {
          documentContext += `- Section: ${doc.section}\n`;
        }
        documentContext += `- Relevance Score: ${doc.relevance.toFixed(2)}\n`;
        documentContext += `\n**Content:**\n${doc.excerpt}\n\n---\n\n`;
      }
    }

    // Build system prompt with semantic search guidance
    const systemPrompt = `You are an internal AI knowledge assistant for ${companyName}. Your role is to help employees find accurate information from the organization's approved knowledge base.

## Important Instructions:
1. Answer questions based on the approved internal documents provided below.
2. You should understand the MEANING and INTENT of questions, not just exact keyword matches.
3. If the documents contain information related to the question (even if worded differently), use that information to answer.
4. When answering, synthesize information naturally and cite the source documents.
5. ${showSources ? "Always mention which document(s) you used to formulate your answer." : "Provide helpful answers based on the knowledge base."}

## Response Guidelines:
- Be concise but thorough
- If multiple documents are relevant, combine the information
- If the question is unclear, ask for clarification
- For sensitive topics (HR issues, legal matters), recommend speaking with the appropriate department

## When No Information is Found:
${refuseWithoutSources 
  ? `- Clearly state: "I couldn't find approved internal documentation on this topic."
- Suggest the user try rephrasing or check with a specific department
- Offer the "Request Knowledge" option to flag this as a gap`
  : `- You may provide general guidance while noting it's not from the internal knowledge base
- Still recommend checking official sources for critical matters`}

${documentContext || "\n## Note: No approved documents are currently available in the knowledge base. Please upload and approve documents to enable AI-powered answers.\n"}`;

    // Check if we should refuse without sources
    if (refuseWithoutSources && relevantDocs.length === 0) {
      const noSourceResponse = {
        content: `I searched the approved knowledge base but couldn't find documentation that addresses your question.

**Your question:** "${userQuestion}"

**What you can do:**
• Try rephrasing with different terms or more specific details
• Check if this topic falls under a specific department (HR, Legal, Finance, etc.)
• Use the **"Request Knowledge"** button to submit a request for this information to be added

Would you like me to help you rephrase your question, or would you like to submit a knowledge request?`,
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

    console.log("Calling AI gateway...");

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

    // Prepare sources for response with section info
    const sourcesForResponse = showSources && relevantDocs.length > 0
      ? relevantDocs.map(d => ({
          id: d.id,
          title: d.title,
          department: d.department,
          type: d.knowledge_type,
          section: d.section || undefined,
        }))
      : [];

    // Log if no sources were found (for gap analysis)
    if (relevantDocs.length === 0) {
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

    console.log(`Response generated successfully with ${sourcesForResponse.length} sources`);

    return new Response(
      JSON.stringify({
        content: assistantMessage,
        sources: sourcesForResponse,
        hasNoSource: relevantDocs.length === 0,
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
