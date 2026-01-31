import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const AI_MODEL = "openai/gpt-5";
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface VectorSearchResult {
  id: string;
  document_id: string;
  chunk_text: string;
  similarity: number;
  document_title: string;
  department: string | null;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

// Generate query embedding using OpenAI
async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI embedding error: ${response.status} - ${errorText}`);
    throw new Error(`Query embedding failed: ${response.status}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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

    let relevantChunks: VectorSearchResult[] = [];
    let usedVectorSearch = false;

    // Try vector similarity search first (if OpenAI API key is available)
    if (OPENAI_API_KEY) {
      try {
        console.log(`[AI-CHAT] Generating query embedding for: "${userQuestion.substring(0, 50)}..."`);
        
        const queryEmbedding = await generateQueryEmbedding(userQuestion, OPENAI_API_KEY);
        const embeddingStr = `[${queryEmbedding.join(",")}]`;
        
        console.log(`[AI-CHAT] Searching embeddings for user: ${user.id}`);
        
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          "search_document_embeddings",
          {
            p_user_id: user.id,
            p_query_embedding: embeddingStr,
            p_match_count: topK,
            p_match_threshold: 0.5, // Lower threshold for more results
          }
        );

        if (vectorError) {
          console.error("[AI-CHAT] Vector search error:", vectorError);
        } else if (vectorResults && vectorResults.length > 0) {
          relevantChunks = vectorResults as VectorSearchResult[];
          usedVectorSearch = true;
          console.log(`[AI-CHAT] Vector search found ${relevantChunks.length} chunks`);
        }
      } catch (embeddingError) {
        console.error("[AI-CHAT] Embedding/vector search failed:", embeddingError);
      }
    }

    // Fallback to FTS if vector search didn't find results
    if (relevantChunks.length === 0) {
      console.log(`[AI-CHAT] Falling back to FTS for: "${userQuestion.substring(0, 50)}..."`);
      
      const { data: ftsResults, error: ftsError } = await supabase.rpc("search_user_documents", {
        p_user_id: user.id,
        p_query: userQuestion,
        p_limit: topK,
      });

      if (ftsError) {
        console.error("[AI-CHAT] FTS search error:", ftsError);
      } else if (ftsResults && ftsResults.length > 0) {
        // Convert FTS results to similar format
        relevantChunks = ftsResults.map((doc: { id: string; title: string; department: string; excerpt: string; rank: number }) => ({
          id: doc.id,
          document_id: doc.id,
          chunk_text: doc.excerpt || "",
          similarity: doc.rank,
          document_title: doc.title,
          department: doc.department,
        }));
        console.log(`[AI-CHAT] FTS found ${relevantChunks.length} documents`);
      }
    }

    console.log(`[AI-CHAT] Total results: ${relevantChunks.length} (vector: ${usedVectorSearch})`);

    // Build document context from chunks
    let documentContext = "\n\nNote: No relevant documents were found for this question.\n";
    const sourceDocuments: Map<string, { title: string; department: string | null }> = new Map();
    
    if (relevantChunks.length > 0) {
      documentContext = "\n\n---\n\n## RELEVANT DOCUMENT CONTENT:\n\n";
      let totalChars = documentContext.length;
      const maxTotal = 15000;
      
      // Group chunks by document
      const chunksByDoc = new Map<string, { chunks: string[]; title: string; department: string | null }>();
      
      for (const chunk of relevantChunks) {
        const docId = chunk.document_id;
        if (!chunksByDoc.has(docId)) {
          chunksByDoc.set(docId, {
            chunks: [],
            title: chunk.document_title,
            department: chunk.department,
          });
        }
        chunksByDoc.get(docId)!.chunks.push(chunk.chunk_text);
        sourceDocuments.set(docId, { title: chunk.document_title, department: chunk.department });
      }
      
      // Build context with document sections
      for (const [docId, docData] of chunksByDoc) {
        const combinedContent = docData.chunks.join("\n\n");
        const docSection = `### Document: "${docData.title}"\nDepartment: ${docData.department || "General"}\n\n${combinedContent}\n\n---\n\n`;
        
        if (totalChars + docSection.length > maxTotal) {
          // Truncate this section if needed
          const remaining = maxTotal - totalChars - 100;
          if (remaining > 200) {
            documentContext += `### Document: "${docData.title}"\nDepartment: ${docData.department || "General"}\n\n${combinedContent.substring(0, remaining)}... [truncated]\n\n---\n\n`;
          }
          break;
        }
        
        documentContext += docSection;
        totalChars += docSection.length;
      }
      
      console.log(`[AI-CHAT] Document context: ${totalChars} chars from ${chunksByDoc.size} documents`);
    }

    const systemPrompt = `You are a helpful AI assistant for ${companyName}. Your job is to answer questions based on the company's knowledge base documents.

IMPORTANT: Relevant document content is provided below. Use this information to answer the user's question.

Instructions:
1. If the content contains relevant information, provide a clear, helpful answer based on that information.
2. Cite the document title when referencing information (e.g., "According to [Document Title]...").
3. If the content doesn't address the question, say: "I don't see anything in the uploaded documents that addresses this. Could you try rephrasing, or is there a specific document you'd like me to check?"
4. Be direct and confident in your answers - don't be overly cautious if the information is there.
5. Synthesize information from multiple documents when relevant.

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
      showSources && sourceDocuments.size > 0
        ? Array.from(sourceDocuments.entries()).map(([id, doc]) => ({
            id,
            title: doc.title,
            department: doc.department,
          }))
        : [];

    const hasNoSource = relevantChunks.length === 0;

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
        searchMethod: usedVectorSearch ? "vector" : "fts",
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