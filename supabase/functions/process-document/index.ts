import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract text from XML content (removes tags, decodes entities)
function extractTextFromXml(xml: string): string {
  // Remove XML declaration and processing instructions
  let text = xml.replace(/<\?[^?]*\?>/g, "");
  
  // Decode common XML entities
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
  
  // Extract text between tags, focusing on text content elements
  const textMatches: string[] = [];
  
  // Match text content in common Office XML elements
  const patterns = [
    /<w:t[^>]*>([^<]*)<\/w:t>/gi,      // Word paragraphs
    /<a:t[^>]*>([^<]*)<\/a:t>/gi,      // PowerPoint text
    /<t[^>]*>([^<]*)<\/t>/gi,          // Excel cells
    /<si><t>([^<]*)<\/t><\/si>/gi,     // Excel shared strings
    /<v>([^<]*)<\/v>/gi,               // Excel values
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

// Extract text from DOCX files
async function extractDocxText(zip: JSZip): Promise<string> {
  const texts: string[] = [];
  
  // Main document content
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    const content = await docFile.async("string");
    const extracted = extractTextFromXml(content);
    if (extracted) texts.push(extracted);
  }
  
  // Headers and footers
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

// Extract text from PPTX files
async function extractPptxText(zip: JSZip): Promise<string> {
  const slides: string[] = [];
  
  // Get all slide files and sort them
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
  
  // Also extract from notes
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

// Extract text from XLSX files
async function extractXlsxText(zip: JSZip): Promise<string> {
  const texts: string[] = [];
  
  // Shared strings (contains most text content)
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  if (sharedStringsFile) {
    const content = await sharedStringsFile.async("string");
    const extracted = extractTextFromXml(content);
    if (extracted) texts.push(extracted);
  }
  
  // Sheet data
  const sheetFiles = Object.keys(zip.files)
    .filter(f => f.match(/xl\/worksheets\/sheet\d+\.xml/))
    .sort();
  
  for (const filename of sheetFiles) {
    const file = zip.file(filename);
    if (file) {
      const content = await file.async("string");
      // Extract inline strings and values
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

    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Document ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get document details
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

    // Update processing status
    await supabase
      .from("documents")
      .update({ processing_status: "processing", status: "Indexing" })
      .eq("id", documentId);

    console.log(`Processing document: ${doc.title} (${doc.file_path})`);

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from("knowledge-files")
        .download(doc.file_path);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Extract text based on file type
      let contentText = "";
      const fileType = doc.file_type || "";
      const filename = (doc.filename || "").toLowerCase();

      console.log(`File type: ${fileType}, Filename: ${filename}`);

      if (fileType === "text/plain" || filename.endsWith(".txt")) {
        // Plain text files
        contentText = await fileData.text();
        console.log(`Extracted ${contentText.length} chars from plain text`);
        
      } else if (fileType === "text/csv" || filename.endsWith(".csv")) {
        // CSV files
        contentText = await fileData.text();
        console.log(`Extracted ${contentText.length} chars from CSV`);
        
      } else if (fileType === "application/pdf" || filename.endsWith(".pdf")) {
        // For PDFs, extract readable text
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = decoder.decode(uint8Array);
        
        // Extract readable ASCII text portions
        const readablePattern = /[\x20-\x7E\n\r\t]+/g;
        const matches = rawText.match(readablePattern) || [];
        contentText = matches
          .filter(m => m.length > 20)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        
        if (!contentText || contentText.length < 50) {
          contentText = `[PDF document: ${doc.title}] - This PDF may contain scanned images. Text extraction limited.`;
        }
        console.log(`Extracted ${contentText.length} chars from PDF`);
        
      } else if (
        fileType.includes("wordprocessingml") || 
        filename.endsWith(".docx")
      ) {
        // DOCX files
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractDocxText(zip);
        console.log(`Extracted ${contentText.length} chars from DOCX`);
        
      } else if (
        fileType.includes("presentationml") || 
        filename.endsWith(".pptx")
      ) {
        // PPTX files
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractPptxText(zip);
        console.log(`Extracted ${contentText.length} chars from PPTX`);
        
      } else if (
        fileType.includes("spreadsheetml") || 
        filename.endsWith(".xlsx")
      ) {
        // XLSX files
        const arrayBuffer = await fileData.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        contentText = await extractXlsxText(zip);
        console.log(`Extracted ${contentText.length} chars from XLSX`);
        
      } else {
        // Unknown file type - try as text
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

      // Ensure we have some content
      if (!contentText || contentText.trim().length === 0) {
        contentText = `[Document: ${doc.title}] - No text content could be extracted from this file.`;
      }

      // Add document metadata to help with search
      const enrichedContent = `
Title: ${doc.title}
Department: ${doc.department || "General"}
${doc.notes ? `Notes: ${doc.notes}` : ""}

Content:
${contentText}
      `.trim();

      // Calculate chunk count (rough estimate: ~500 chars per chunk)
      const chunkCount = Math.max(1, Math.ceil(enrichedContent.length / 500));

      // Get company settings to determine approval behavior
      const { data: settings } = await supabase
        .from("company_settings")
        .select("require_manual_approval")
        .eq("user_id", user.id)
        .single();

      const requireManualApproval = settings?.require_manual_approval ?? false;

      // Update document with extracted content and status
      const updateData: Record<string, unknown> = {
        content_text: enrichedContent,
        processing_status: "completed",
        processed_at: new Date().toISOString(),
        chunk_count: chunkCount,
        status: "Ready",
      };

      // Auto-approve if manual approval is not required
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

      // Log activity
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
      
      // Update document with error status
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
