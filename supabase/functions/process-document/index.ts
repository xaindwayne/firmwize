import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      .update({ processing_status: "processing" })
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

      if (fileType === "text/plain" || fileType === "text/csv") {
        // Plain text files
        contentText = await fileData.text();
      } else if (fileType === "application/pdf") {
        // For PDFs, extract what we can (basic extraction)
        // In production, you'd use a proper PDF parser
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Simple text extraction - look for text streams
        let text = "";
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = decoder.decode(uint8Array);
        
        // Extract readable ASCII text portions
        const readablePattern = /[\x20-\x7E\n\r\t]+/g;
        const matches = rawText.match(readablePattern) || [];
        text = matches
          .filter(m => m.length > 20) // Filter out short fragments
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        
        contentText = text || `[PDF document: ${doc.title}] - Content indexed for search`;
      } else if (
        fileType.includes("wordprocessingml") ||
        fileType.includes("spreadsheetml") ||
        fileType.includes("presentationml")
      ) {
        // Office documents - extract what we can
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = decoder.decode(uint8Array);
        
        // Extract XML text content
        const textPattern = /<[^>]*>([^<]+)<\/[^>]*>/g;
        const matches = [];
        let match;
        while ((match = textPattern.exec(rawText)) !== null) {
          if (match[1] && match[1].trim().length > 3) {
            matches.push(match[1].trim());
          }
        }
        
        contentText = matches.join(" ").replace(/\s+/g, " ").trim() || 
          `[${doc.file_type} document: ${doc.title}] - Content indexed for search`;
      } else {
        contentText = `[Document: ${doc.title}] - File type: ${fileType}`;
      }

      // Add document metadata to help with search
      const enrichedContent = `
Title: ${doc.title}
Department: ${doc.department || "General"}
Category: ${doc.category_id || "Uncategorized"}
Notes: ${doc.notes || ""}

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
      // NOTE: status must be one of: 'Uploaded', 'Indexing', 'Ready', 'Failed' (per check constraint)
      const updateData: Record<string, any> = {
        content_text: enrichedContent,
        processing_status: "completed",
        processed_at: new Date().toISOString(),
        chunk_count: chunkCount,
        status: "Ready", // Use 'Ready' instead of 'Indexed' to match check constraint
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

      // Log activity - use 'Upload' action as it's allowed by check constraint
      // (activity_logs.action must be: Upload, Rename, Recategorize, Version Update, Deprecate, Delete, Settings Change)
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Upload",
        document_id: documentId,
        document_title: doc.title,
        details: `Processed: ${enrichedContent.length} chars, ${chunkCount} chunks. Status: ${updateData.document_status}`,
        result: "Success",
      });

      console.log(`Document processed successfully: ${doc.title}`);

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
