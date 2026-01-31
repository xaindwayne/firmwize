import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Model configuration - logged for transparency (not exposed to end users)
// Using Lovable AI Gateway with OpenAI GPT-5 for ChatGPT-level quality
const AI_MODEL = "openai/gpt-5";
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Semantic search across documents - now searches ALL documents (not just approved)
function semanticSearch(query: string, documents: any[]): DocumentSource[] {
  const results: DocumentSource[] = [];

  for (const doc of documents) {
    const searchableText = `${doc.title || ''} ${doc.content_text || ''} ${doc.questions_answered || ''} ${doc.notes || ''}`;
    const { score, excerpt, section } = calculateRelevance(query, searchableText, doc.title || '');

    if (score > 0.3) { // Lower threshold for better recall
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
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Log model info at startup for admin transparency
  console.info(`[AI-CHAT] Model Configuration: ${AI_MODEL}`);
  console.info(`[AI-CHAT] API Endpoint: Lovable AI Gateway (${AI_GATEWAY_URL})`);

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

    console.info(`[AI-CHAT] Processing question: "${userQuestion.slice(0, 100)}..."`);

    // Fetch ALL documents with content - no approval filtering
    // Every uploaded document is treated as an approved source
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, department, knowledge_type, content_text, questions_answered, notes, chunk_count")
      .eq("user_id", user.id)
      .eq("ai_enabled", true)
      .eq("processing_status", "completed")
      .not("content_text", "is", null);

    if (docsError) {
      console.error("[AI-CHAT] Error fetching documents:", docsError);
    }

    const totalDocs = documents?.length || 0;
    console.info(`[AI-CHAT] Found ${totalDocs} documents available for search (all treated as approved)`);

    // Perform semantic search
    const relevantDocs = documents && documents.length > 0 
      ? semanticSearch(userQuestion, documents)
      : [];

    console.info(`[AI-CHAT] Semantic search found ${relevantDocs.length} relevant documents`);
    if (relevantDocs.length > 0) {
      console.info(`[AI-CHAT] Top matches: ${relevantDocs.slice(0, 3).map(d => `"${d.title}" (score: ${d.relevance.toFixed(2)})`).join(', ')}`);
    }

    // Get company settings (for company name only, not for refuse behavior)
    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_name, show_sources_in_answers")
      .eq("user_id", user.id)
      .single();

    const companyName = settings?.company_name || "your organization";
    const showSources = settings?.show_sources_in_answers ?? true;

    // Build context from relevant documents - include full content for better comprehension
    let documentContext = "";
    
    if (relevantDocs.length > 0) {
      documentContext = "\n\n---\n\n## RETRIEVED DOCUMENT CONTENT:\n\n";
      for (const doc of relevantDocs) {
        documentContext += `### Document: "${doc.title}"\n`;
        if (doc.department) documentContext += `Department: ${doc.department}\n`;
        if (doc.section) documentContext += `Relevant Section: ${doc.section}\n`;
        documentContext += `\n${doc.excerpt}\n\n---\n\n`;
      }
    }

    // Build confident, ChatGPT-style system prompt
    const systemPrompt = `You are an expert AI assistant for ${companyName}. Your job is to provide accurate, helpful, and confident answers to employee questions using the organization's document knowledge base.

## Your Behavior:

1. **Answer confidently**: If the retrieved documents contain relevant information, synthesize it into a clear, direct answer. Do not hedge unnecessarily.

2. **Be thorough but concise**: Provide complete answers that address the user's question. Include relevant details from the documents.

3. **Cite sources naturally**: When appropriate, mention which document contains the information (e.g., "According to the Employee Handbook..." or "The Finance Policy states...").

4. **Use good judgment**: If the documents contain partial information, use it to give the best possible answer. Don't refuse just because coverage isn't 100% complete.

5. **Only decline when truly empty**: If the documents genuinely contain NOTHING relevant to the question, respond with: "I don't see anything in the uploaded documents that addresses this. Could you try rephrasing, or is there a specific document you'd like me to check?"

6. **Handle ambiguity**: If the question is unclear, ask a clarifying question rather than refusing.

## What NOT to do:

- Do NOT say "I couldn't find an approved source" - all documents are approved
- Do NOT add unnecessary disclaimers like "based on available information" when you have clear answers
- Do NOT refuse to answer if there's ANY relevant content in the documents
- Do NOT be overly cautious - answer like a knowledgeable colleague would

${documentContext || "\nNote: No documents have been uploaded yet. Let the user know they need to upload documents first."}`;

    // Check Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[AI-CHAT] LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured.");
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    console.info(`[AI-CHAT] Calling Lovable AI Gateway with model: ${AI_MODEL}`);
    const requestStartTime = Date.now();

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const requestDuration = Date.now() - requestStartTime;
    console.info(`[AI-CHAT] Lovable AI Gateway response received in ${requestDuration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-CHAT] Lovable AI Gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "AI service authentication error." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    
    // Log usage for monitoring
    const usage = aiResponse.usage;
    if (usage) {
      console.info(`[AI-CHAT] Token usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
    }
    console.info(`[AI-CHAT] Model used: ${aiResponse.model}`);

    // Prepare sources for response
    const sourcesForResponse = showSources && relevantDocs.length > 0
      ? relevantDocs.map(d => ({
          id: d.id,
          title: d.title,
          department: d.department,
          type: d.knowledge_type,
          section: d.section || undefined,
        }))
      : [];

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

    console.info(`[AI-CHAT] Response generated successfully with ${sourcesForResponse.length} sources`);

    // Never set hasNoSource to true - we always try to answer
    return new Response(
      JSON.stringify({
        content: assistantMessage,
        sources: sourcesForResponse,
        hasNoSource: false, // Removed the "no source" behavior
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI-CHAT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
