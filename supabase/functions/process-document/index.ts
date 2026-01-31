import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
  const CHUNK_SIZE = 0x8000; // 32KB chunks
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
  
  // Check file size - limit to ~10MB for API
  if (pdfBytes.length > 10 * 1024 * 1024) {
    throw new Error("PDF too large for AI extraction (max 10MB)");
  }
  
  // Convert PDF to base64 using chunked approach
  const base64 = uint8ArrayToBase64(pdfBytes);
  console.log(`Encoded PDF to base64: ${base64.length} chars`);
  
  // Use AI to extract content
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
      .update({ processing_status: "processing", status: "Indexing" })
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

      if (fileType === "text/plain" || filename.endsWith(".txt")) {
        contentText = await fileData.text();
        console.log(`Extracted ${contentText.length} chars from plain text`);
        
      } else if (fileType === "text/csv" || filename.endsWith(".csv")) {
        contentText = await fileData.text();
        console.log(`Extracted ${contentText.length} chars from CSV`);
        
      } else if (fileType === "application/pdf" || filename.endsWith(".pdf")) {
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        
        // Use AI to extract PDF content
        if (LOVABLE_API_KEY) {
          try {
            contentText = await extractPdfWithAI(buffer, doc.title, LOVABLE_API_KEY);
          } catch (aiError) {
            console.error("AI PDF extraction failed:", aiError);
            contentText = `[PDF document: ${doc.title}] - Unable to extract text. Consider uploading as DOCX or TXT format for better results.`;
          }
        } else {
          contentText = `[PDF document: ${doc.title}] - PDF extraction requires AI service configuration.`;
        }
        
        if (!contentText || contentText.trim().length < 50) {
          contentText = `[PDF document: ${doc.title}] - This PDF may contain scanned images or encrypted content. Consider using DOCX or TXT format.`;
        }
        
      } else if (
        fileType.includes("wordprocessingml") || 
        filename.endsWith(".docx")
      ) {
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractDocxText(zip);
        console.log(`Extracted ${contentText.length} chars from DOCX`);
        
      } else if (
        fileType.includes("presentationml") || 
        filename.endsWith(".pptx")
      ) {
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractPptxText(zip);
        console.log(`Extracted ${contentText.length} chars from PPTX`);
        
      } else if (
        fileType.includes("spreadsheetml") || 
        filename.endsWith(".xlsx")
      ) {
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractXlsxText(zip);
        console.log(`Extracted ${contentText.length} chars from XLSX`);
        
      } else {
        try {
          contentText = await fileData.text();
          if (contentText.includes("\0") || contentText.length < 10) {
            contentText = `[Document: ${doc.title}] - File type: ${fileType}. Unable to extract text content.`;
          }
        } catch {
          contentText = `[Document: ${doc.title}] - File type: ${fileType}. Unable to extract text content.`;
        }
        console.log(`Fallback extraction: ${contentText.length} chars`);
      }

      if (!contentText || contentText.trim().length === 0) {
        contentText = `[Document: ${doc.title}] - No text content could be extracted from this file.`;
      }

      const enrichedContent = `
Title: ${doc.title}
Department: ${doc.department || "General"}
${doc.notes ? `Notes: ${doc.notes}` : ""}

Content:
${contentText}
      `.trim();

      const chunkCount = Math.max(1, Math.ceil(enrichedContent.length / 500));

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
        chunk_count: chunkCount,
        status: "Ready",
      };

      if (!requireManualApproval) {
        updateData.document_status = "approved";
      } else {
        updateData.document_status = "in_review";
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update(updateData)
        .eq("id", documentId);

      if (updateError) {
        console.error("Failed to update document:", updateError);
        throw new Error(`Failed to update document: ${updateError.message}`);
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Upload",
        document_id: documentId,
        document_title: doc.title,
        details: `Processed: ${enrichedContent.length} chars, ${chunkCount} chunks. Status: ${updateData.document_status}`,
        result: "Success",
      });

      console.log(`Document processed successfully: ${doc.title} (${enrichedContent.length} chars)`);

      return new Response(
        JSON.stringify({
          success: true,
          documentId,
          status: updateData.document_status,
          chunkCount,
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
