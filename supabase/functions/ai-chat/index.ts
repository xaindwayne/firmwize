import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const AI_MODEL = "openai/gpt-5";
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RetrievedDoc {
  id: string;
  title: string;
  department: string | null;
  knowledge_type: string | null;
  rank: number;
  excerpt: string;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

function truncate(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

function buildDocumentContext(docs: RetrievedDoc[], maxChars: number) {
  let out = "\n\n---\n\n## RETRIEVED DOCUMENT EXCERPTS:\n\n";
  let used = out.length;

  for (const doc of docs) {
    const headerLines: string[] = [];
    headerLines.push(`### Document: "${doc.title}"`);
    if (doc.department) headerLines.push(`Department: ${doc.department}`);

    const header = headerLines.join("\n") + "\n\nContent excerpt:\n";
    // Use a larger excerpt - up to 2500 chars per document
    const excerpt = truncate((doc.excerpt || "").trim().replace(/<\/?b>/g, ''), 2500) + "\n\n---\n\n";

    const next = header + excerpt;
    if (used + next.length > maxChars) break;

    out += next;
    used += next.length;
  }

  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabase.auth.getUser(token);
    const user = data?.user;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      messages: ChatMessage[];
      conversationId?: string;
      topK?: number;
    };

    const messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userQuestion = messages[messages.length - 1]?.content?.trim() || "";
    if (!userQuestion) {
      return new Response(JSON.stringify({ error: "Last message content is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topK = clampInt(body.topK, 1, 12, 8);

    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_name, show_sources_in_answers")
      .eq("user_id", user.id)
      .single();

    const companyName = settings?.company_name || "your organization";
    const showSources = settings?.show_sources_in_answers ?? true;

    // Server-side ranked retrieval (fast + accurate)
    console.log(`[AI-CHAT] Searching documents for user: ${user.id}, query: "${userQuestion.substring(0, 50)}..."`);
    
    const { data: docs, error: docsError } = await supabase.rpc("search_user_documents", {
      p_user_id: user.id,
      p_query: userQuestion,
      p_limit: topK,
    });

    if (docsError) {
      console.error("[AI-CHAT] search_user_documents error:", docsError);
    }
    
    console.log(`[AI-CHAT] Found ${docs?.length || 0} documents`);

    const relevantDocs: RetrievedDoc[] = Array.isArray(docs) ? (docs as RetrievedDoc[]) : [];

    // Fetch full content for matched documents (up to 3)
    let documentContext = "\n\nNote: No relevant documents were found for this question.\n";
    
    if (relevantDocs.length > 0) {
      const docIds = relevantDocs.slice(0, 3).map(d => d.id);
      const { data: fullDocs } = await supabase
        .from("documents")
        .select("id, title, department, content_text")
        .in("id", docIds);
      
      if (fullDocs && fullDocs.length > 0) {
        documentContext = "\n\n---\n\n## DOCUMENT CONTENT:\n\n";
        let totalChars = documentContext.length;
        const maxTotal = 15000;
        
        for (const doc of fullDocs) {
          const content = doc.content_text || "";
          // Truncate individual docs to ~5000 chars if needed
          const truncatedContent = content.length > 5000 
            ? content.substring(0, 5000) + "... [content truncated]"
            : content;
          
          const docSection = `### Document: "${doc.title}"\nDepartment: ${doc.department || "General"}\n\n${truncatedContent}\n\n---\n\n`;
          
          if (totalChars + docSection.length > maxTotal) {
            console.log(`[AI-CHAT] Stopping at ${totalChars} chars (would exceed max)`);
            break;
          }
          
          documentContext += docSection;
          totalChars += docSection.length;
        }
        
        console.log(`[AI-CHAT] Full document context: ${totalChars} chars`);
      }
    }

    console.log(`[AI-CHAT] Document context length: ${documentContext.length} chars`);

    const systemPrompt = `You are a helpful AI assistant for ${companyName}. Your job is to answer questions based on the company's knowledge base documents.

IMPORTANT: Document excerpts are provided below. Use this information to answer the user's question.

Instructions:
1. If the excerpts contain relevant information, provide a clear, helpful answer based on that information.
2. Cite the document title when referencing information (e.g., "According to [Document Title]...").
3. If the excerpts don't contain information relevant to the question, say: "I don't see anything in the uploaded documents that addresses this. Could you try rephrasing, or is there a specific document you'd like me to check?"
4. Be direct and confident in your answers - don't be overly cautious if the information is there.

${documentContext}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: aiMessages,
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-CHAT] AI Gateway error: ${response.status} - ${errorText}`);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "AI service authentication error." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `AI Gateway error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const assistantMessage =
      aiResponse.choices?.[0]?.message?.content ||
      "I apologize, but I couldn't generate a response. Please try again.";

    const sourcesForResponse =
      showSources && relevantDocs.length > 0
        ? relevantDocs.map((d) => ({
            id: d.id,
            title: d.title,
            department: d.department,
            type: d.knowledge_type,
          }))
        : [];

    const hasNoSource = relevantDocs.length === 0;

    if (body.conversationId) {
      await supabase.from("chat_messages").insert([
        { conversation_id: body.conversationId, role: "user", content: userQuestion },
        {
          conversation_id: body.conversationId,
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
        hasNoSource,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AI-CHAT] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
