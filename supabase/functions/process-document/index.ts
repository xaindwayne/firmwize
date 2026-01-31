import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const AI_MODEL = "openai/gpt-5";

// Extract text from XML content (removes tags, decodes entities)
function extractTextFromXml(xml: string): string {
  let text = xml.replace(/<\?[^?]*\?>/g, "");
  
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&#x27;": "'",
  };
  
  for (const [entity, char] of Object.entries(entities)) {
    text = text.split(entity).join(char);
  }
  
  const textMatches: string[] = [];
  const patterns = [
    /<w:t[^>]*>([^<]*)<\/w:t>/gi,
    /<a:t[^>]*>([^<]*)<\/a:t>/gi,
    /<t[^>]*>([^<]*)<\/t>/gi,
    /<si><t>([^<]*)<\/t><\/si>/gi,
    /<v>([^<]*)<\/v>/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const content = match[1]?.trim();
      if (content && content.length > 0) {
        textMatches.push(content);
      }
    }
  }
  
  return textMatches.join(" ").replace(/\s+/g, " ").trim();
}

async function extractDocxText(zip: JSZip): Promise<string> {
  const texts: string[] = [];
  
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    const content = await docFile.async("string");
    const extracted = extractTextFromXml(content);
    if (extracted) texts.push(extracted);
  }
  
  for (const filename of Object.keys(zip.files)) {
    if (filename.match(/word\/(header|footer)\d*\.xml/)) {
      const file = zip.file(filename);
      if (file) {
        const content = await file.async("string");
        const extracted = extractTextFromXml(content);
        if (extracted) texts.push(extracted);
      }
    }
  }
  
  return texts.join("\n\n");
}

async function extractPptxText(zip: JSZip): Promise<string> {
  const slides: string[] = [];
  
  const slideFiles = Object.keys(zip.files)
    .filter(f => f.match(/ppt\/slides\/slide\d+\.xml/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return numA - numB;
    });
  
  for (const filename of slideFiles) {
    const file = zip.file(filename);
    if (file) {
      const content = await file.async("string");
      const extracted = extractTextFromXml(content);
      if (extracted) {
        const slideNum = filename.match(/slide(\d+)/)?.[1] || "?";
        slides.push(`[Slide ${slideNum}] ${extracted}`);
      }
    }
  }
  
  const noteFiles = Object.keys(zip.files)
    .filter(f => f.match(/ppt\/notesSlides\/notesSlide\d+\.xml/));
  
  for (const filename of noteFiles) {
    const file = zip.file(filename);
    if (file) {
      const content = await file.async("string");
      const extracted = extractTextFromXml(content);
      if (extracted) {
        slides.push(`[Notes] ${extracted}`);
      }
    }
  }
  
  return slides.join("\n\n");
}

async function extractXlsxText(zip: JSZip): Promise<string> {
  const texts: string[] = [];
  
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  if (sharedStringsFile) {
    const content = await sharedStringsFile.async("string");
    const extracted = extractTextFromXml(content);
    if (extracted) texts.push(extracted);
  }
  
  const sheetFiles = Object.keys(zip.files)
    .filter(f => f.match(/xl\/worksheets\/sheet\d+\.xml/))
    .sort();
  
  for (const filename of sheetFiles) {
    const file = zip.file(filename);
    if (file) {
      const content = await file.async("string");
      const inlineMatches: string[] = [];
      const inlinePattern = /<is><t>([^<]*)<\/t><\/is>/gi;
      let match;
      while ((match = inlinePattern.exec(content)) !== null) {
        if (match[1]?.trim()) inlineMatches.push(match[1].trim());
      }
      if (inlineMatches.length > 0) {
        texts.push(inlineMatches.join(" "));
      }
    }
  }
  
  return texts.join("\n\n");
}

// Convert Uint8Array to base64 without stack overflow
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  const chunks: string[] = [];
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  
  return btoa(chunks.join(''));
}

// Use AI to extract text from PDF via base64
async function extractPdfWithAI(pdfBytes: Uint8Array, title: string, apiKey: string): Promise<string> {
  console.log(`Attempting AI-based PDF extraction for ${pdfBytes.length} bytes...`);
  
  if (pdfBytes.length > 10 * 1024 * 1024) {
    throw new Error("PDF too large for AI extraction (max 10MB)");
  }
  
  const base64 = uint8ArrayToBase64(pdfBytes);
  console.log(`Encoded PDF to base64: ${base64.length} chars`);
  
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract ALL text content from this PDF document titled "${title}". 

Return ONLY the extracted text, preserving structure (headings, paragraphs, lists, tables).
Do not add commentary - just the raw text from all pages.
Format tables as plain text. Extract any text from images via OCR.`,
            },
            {
              type: "file",
              file: {
                filename: `${title}.pdf`,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI extraction failed: ${response.status} - ${errorText}`);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || "";
  
  console.log(`AI extracted ${extractedText.length} chars from PDF`);
  return extractedText;
}

interface SemanticChunk {
  content: string;
  topic: string;
  type: string;
  context: string;
}

// Use AI to analyze document and create semantic chunks
async function analyzeAndChunkDocument(
  rawText: string, 
  title: string, 
  department: string,
  apiKey: string
): Promise<SemanticChunk[]> {
  console.log(`Analyzing document with AI: ${title} (${rawText.length} chars)`);
  
  // Truncate very long documents for analysis
  const maxAnalysisLength = 50000;
  const textForAnalysis = rawText.length > maxAnalysisLength 
    ? rawText.substring(0, maxAnalysisLength) + "\n\n[Document truncated for analysis...]"
    : rawText;
  
  const analysisPrompt = `You are a knowledge extraction specialist. Analyze this document and break it into semantic chunks that preserve meaning and context.

DOCUMENT TITLE: ${title}
DEPARTMENT: ${department}

DOCUMENT CONTENT:
${textForAnalysis}

---

Your task:
1. Identify the key topics, processes, policies, rules, and concepts in this document
2. Break the document into 5-20 semantic chunks, where each chunk:
   - Contains a complete, self-contained piece of knowledge
   - Preserves context and relationships to other concepts
   - Is between 200-1500 characters
   - Can answer a specific question or explain a specific topic

For each chunk, provide:
- content: The actual text/information (can be paraphrased or restructured for clarity)
- topic: A short label describing what this chunk is about
- type: One of: process, policy, definition, rule, exception, contact, faq, procedure, overview, detail
- context: Brief context about how this relates to the broader document

Return ONLY a valid JSON array of chunks. Example format:
[
  {
    "content": "The vacation policy allows employees to accrue 15 days of PTO per year. Unused days can be carried over up to a maximum of 5 days into the next calendar year.",
    "topic": "PTO Accrual and Carryover",
    "type": "policy",
    "context": "Part of the employee benefits and vacation policy"
  }
]

IMPORTANT: 
- Extract and restructure information to be clear and self-contained
- Each chunk should make sense on its own without needing the rest of the document
- Preserve specific details like numbers, dates, names, and procedures
- If the document has Q&A sections, keep questions with their answers
- Return ONLY the JSON array, no other text`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: "You are a knowledge extraction AI. You always respond with valid JSON arrays only." },
          { role: "user", content: analysisPrompt }
        ],
        max_completion_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI analysis failed: ${response.status} - ${errorText}`);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();
    
    const chunks = JSON.parse(jsonStr) as SemanticChunk[];
    console.log(`AI created ${chunks.length} semantic chunks`);
    
    // Validate and filter chunks
    const validChunks = chunks.filter(chunk => 
      chunk.content && 
      chunk.content.length >= 50 && 
      chunk.topic && 
      chunk.type
    );
    
    console.log(`Valid semantic chunks: ${validChunks.length}`);
    return validChunks;
    
  } catch (error) {
    console.error("AI chunking failed, falling back to basic chunking:", error);
    return [];
  }
}

// Fallback: Basic mechanical chunking
function basicChunkText(text: string, chunkSize: number, overlap: number): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];
  let start = 0;
  let index = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    
    if (chunk.length > 50) {
      chunks.push({
        content: chunk,
        topic: `Section ${index + 1}`,
        type: "detail",
        context: "Document excerpt"
      });
      index++;
    }
    
    start += chunkSize - overlap;
  }
  
  return chunks;
}

// Generate embeddings using OpenAI API
async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  console.log(`Generating embeddings for ${texts.length} chunks...`);
  
  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI embedding error: ${response.status} - ${errorText}`);
    throw new Error(`Embedding generation failed: ${response.status}`);
  }

  const result = await response.json();
  const embeddings = result.data.map((item: { embedding: number[] }) => item.embedding);
  
  console.log(`Generated ${embeddings.length} embeddings`);
  return embeddings;
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Document ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("documents")
      .update({ processing_status: "processing", status: "Analyzing with AI..." })
      .eq("id", documentId);

    console.log(`Processing document: ${doc.title} (${doc.file_path})`);

    try {
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from("knowledge-files")
        .download(doc.file_path);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      let contentText = "";
      const fileType = doc.file_type || "";
      const filename = (doc.filename || "").toLowerCase();

      console.log(`File type: ${fileType}, Filename: ${filename}`);

      // Step 1: Extract raw text from document
      if (fileType === "text/plain" || filename.endsWith(".txt")) {
        contentText = await fileData.text();
        console.log(`Extracted ${contentText.length} chars from plain text`);
        
      } else if (fileType === "text/csv" || filename.endsWith(".csv")) {
        contentText = await fileData.text();
        console.log(`Extracted ${contentText.length} chars from CSV`);
        
      } else if (fileType === "application/pdf" || filename.endsWith(".pdf")) {
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        
        if (LOVABLE_API_KEY) {
          try {
            contentText = await extractPdfWithAI(buffer, doc.title, LOVABLE_API_KEY);
          } catch (aiError) {
            console.error("AI PDF extraction failed:", aiError);
            contentText = `[PDF document: ${doc.title}] - Unable to extract text.`;
          }
        } else {
          contentText = `[PDF document: ${doc.title}] - PDF extraction requires AI service.`;
        }
        
      } else if (fileType.includes("wordprocessingml") || filename.endsWith(".docx")) {
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractDocxText(zip);
        console.log(`Extracted ${contentText.length} chars from DOCX`);
        
      } else if (fileType.includes("presentationml") || filename.endsWith(".pptx")) {
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractPptxText(zip);
        console.log(`Extracted ${contentText.length} chars from PPTX`);
        
      } else if (fileType.includes("spreadsheetml") || filename.endsWith(".xlsx")) {
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractXlsxText(zip);
        console.log(`Extracted ${contentText.length} chars from XLSX`);
        
      } else {
        try {
          contentText = await fileData.text();
          if (contentText.includes("\0") || contentText.length < 10) {
            contentText = `[Document: ${doc.title}] - Unable to extract text.`;
          }
        } catch {
          contentText = `[Document: ${doc.title}] - Unable to extract text.`;
        }
      }

      if (!contentText || contentText.trim().length === 0) {
        contentText = `[Document: ${doc.title}] - No text content could be extracted.`;
      }

      // Step 2: Use AI to analyze and create semantic chunks
      let semanticChunks: SemanticChunk[] = [];
      
      if (LOVABLE_API_KEY && contentText.length > 100) {
        await supabase
          .from("documents")
          .update({ status: "AI analyzing content..." })
          .eq("id", documentId);
          
        semanticChunks = await analyzeAndChunkDocument(
          contentText, 
          doc.title, 
          doc.department || "General",
          LOVABLE_API_KEY
        );
      }
      
      // Fallback to basic chunking if AI analysis failed or returned no chunks
      if (semanticChunks.length === 0) {
        console.log("Using fallback basic chunking");
        semanticChunks = basicChunkText(contentText, 1000, 200);
      }

      // Build enriched content for storage (combine all chunks)
      const enrichedContent = `
Title: ${doc.title}
Department: ${doc.department || "General"}
${doc.notes ? `Notes: ${doc.notes}` : ""}

--- AI-Analyzed Knowledge ---

${semanticChunks.map((chunk, i) => `
[${chunk.topic}] (${chunk.type})
${chunk.content}
Context: ${chunk.context}
`).join("\n---\n")}
      `.trim();

      // Step 3: Generate embeddings for semantic chunks
      let embeddingsGenerated = 0;
      
      if (OPENAI_API_KEY && semanticChunks.length > 0) {
        try {
          await supabase
            .from("documents")
            .update({ status: "Generating embeddings..." })
            .eq("id", documentId);
            
          console.log(`Generating embeddings for ${semanticChunks.length} semantic chunks`);
          
          // Delete existing embeddings
          await supabase
            .from("document_embeddings")
            .delete()
            .eq("document_id", documentId);
          
          // Prepare embedding texts with context
          const embeddingTexts = semanticChunks.map(chunk => 
            `[${chunk.topic}] [${chunk.type}] ${chunk.content} (Context: ${chunk.context})`
          );
          
          // Generate embeddings in batches
          const batchSize = 20;
          
          for (let i = 0; i < embeddingTexts.length; i += batchSize) {
            const batchTexts = embeddingTexts.slice(i, i + batchSize);
            const batchChunks = semanticChunks.slice(i, i + batchSize);
            const embeddings = await generateEmbeddings(batchTexts, OPENAI_API_KEY);
            
            // Store embeddings with semantic metadata
            const embeddingRecords = batchChunks.map((chunk, idx) => ({
              document_id: documentId,
              user_id: user.id,
              chunk_index: i + idx,
              chunk_text: `[${chunk.topic}] (${chunk.type})\n${chunk.content}\nContext: ${chunk.context}`,
              embedding: `[${embeddings[idx].join(",")}]`,
            }));
            
            const { error: insertError } = await supabase
              .from("document_embeddings")
              .insert(embeddingRecords);
            
            if (insertError) {
              console.error("Error inserting embeddings:", insertError);
            } else {
              embeddingsGenerated += batchChunks.length;
            }
          }
          
          console.log(`Stored ${embeddingsGenerated} semantic embeddings`);
        } catch (embeddingError) {
          console.error("Embedding generation failed:", embeddingError);
        }
      }

      // Update document with processed content
      const { data: settings } = await supabase
        .from("company_settings")
        .select("require_manual_approval")
        .eq("user_id", user.id)
        .single();

      const requireManualApproval = settings?.require_manual_approval ?? false;

      const updateData: Record<string, unknown> = {
        content_text: enrichedContent,
        processing_status: "completed",
        processed_at: new Date().toISOString(),
        chunk_count: embeddingsGenerated || semanticChunks.length,
        status: "Ready",
        document_status: requireManualApproval ? "in_review" : "approved",
      };

      const { error: updateError } = await supabase
        .from("documents")
        .update(updateData)
        .eq("id", documentId);

      if (updateError) {
        throw new Error(`Failed to update document: ${updateError.message}`);
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Upload",
        document_id: documentId,
        document_title: doc.title,
        details: `AI-processed: ${contentText.length} chars → ${semanticChunks.length} semantic chunks → ${embeddingsGenerated} embeddings`,
        result: "Success",
      });

      console.log(`Document AI-processed: ${doc.title} (${semanticChunks.length} chunks, ${embeddingsGenerated} embeddings)`);

      return new Response(
        JSON.stringify({
          success: true,
          documentId,
          status: updateData.document_status,
          semanticChunks: semanticChunks.length,
          embeddingsGenerated,
          contentLength: enrichedContent.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (processingError) {
      console.error("Processing error:", processingError);
      
      await supabase
        .from("documents")
        .update({
          processing_status: "failed",
          processing_error: processingError instanceof Error ? processingError.message : "Unknown error",
          status: "Failed",
        })
        .eq("id", documentId);

      return new Response(
        JSON.stringify({
          success: false,
          error: processingError instanceof Error ? processingError.message : "Processing failed",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});