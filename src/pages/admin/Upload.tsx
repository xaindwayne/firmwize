import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Upload as UploadIcon, FileText, X, CheckCircle2, Loader2, AlertCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const SUPPORTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Legal', 'Compliance', 'Other'];
const SENSITIVITY_LEVELS = ['Public', 'Internal', 'Restricted'];

interface Category { id: string; name: string; }

interface RecentUpload {
  id: string;
  title: string;
  document_status: string;
  processing_status: string;
  created_at: string;
}

interface CompanySettings {
  require_manual_approval: boolean;
}

export default function UploadPage() {
  const { user, session } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({ title: '', categoryId: '', department: 'Other', region: '', sensitivity: 'Internal', notes: '' });
  const [dragActive, setDragActive] = useState(false);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [settings, setSettings] = useState<CompanySettings>({ require_manual_approval: false });

  useEffect(() => {
    if (user) {
      supabase.from('categories').select('id, name').eq('user_id', user.id).then(({ data }) => setCategories(data || []));
      
      // Fetch company settings
      supabase.from('company_settings').select('require_manual_approval').eq('user_id', user.id).single().then(({ data }) => {
        if (data) setSettings({ require_manual_approval: data.require_manual_approval ?? false });
      });

      // Fetch recent uploads
      fetchRecentUploads();
    }
  }, [user]);

  const fetchRecentUploads = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('id, title, document_status, processing_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) {
      setRecentUploads(data as RecentUpload[]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => SUPPORTED_TYPES.includes(f.type));
    if (droppedFiles.length) setFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files).filter(f => SUPPORTED_TYPES.includes(f.type)));
  };

  const processDocument = async (documentId: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ documentId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error('Processing error:', data.error);
      }
    } catch (error) {
      console.error('Failed to trigger processing:', error);
    }
  };

  // Sanitize filename for Supabase Storage (remove emojis, special chars, spaces)
  const sanitizeFilename = (filename: string): string => {
    // Remove emojis and special unicode characters
    const withoutEmojis = filename.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}]/gu, '');
    // Replace spaces and other problematic characters with underscores
    const sanitized = withoutEmojis
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .replace(/[^\w\-_.]/g, '')      // Remove any remaining non-word chars except - _ .
      .replace(/_+/g, '_')            // Replace multiple underscores with single
      .replace(/^_|_$/g, '');         // Remove leading/trailing underscores
    
    return sanitized || 'document';   // Fallback if everything was removed
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const uploadedDocIds: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i) / files.length) * 100));

        const sanitizedFilename = sanitizeFilename(file.name);
        const filePath = `${user.id}/${Date.now()}_${sanitizedFilename}`;
        const { error: uploadError } = await supabase.storage.from('knowledge-files').upload(filePath, file);
        if (uploadError) throw uploadError;

        // Set initial document_status based on manual approval setting
        // If manual approval is off, we'll set it to approved after processing
        // If manual approval is on, it stays in_review until manually approved
        const initialDocStatus = settings.require_manual_approval ? 'in_review' : 'draft';
        
        const { data: docData, error: dbError } = await supabase.from('documents').insert({
          user_id: user.id,
          title: formData.title || file.name,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          category_id: formData.categoryId || null,
          department: formData.department,
          region: formData.region || null,
          sensitivity: formData.sensitivity,
          notes: formData.notes || null,
          status: 'Uploaded',
          processing_status: 'pending',
          document_status: initialDocStatus,
        }).select('id').single();

        if (dbError) throw dbError;

        uploadedDocIds.push(docData.id);

        await supabase.from('activity_logs').insert({ 
          user_id: user.id, 
          action: 'Upload', 
          document_id: docData.id,
          document_title: formData.title || file.name, 
          details: `Uploaded ${file.name}`, 
          result: 'Success' 
        });
      }

      setUploadProgress(100);
      toast.success('Files uploaded successfully! Processing for AI...');
      
      // Trigger processing for all uploaded documents
      for (const docId of uploadedDocIds) {
        processDocument(docId);
      }

      setFiles([]);
      setFormData({ title: '', categoryId: '', department: 'Other', region: '', sensitivity: 'Internal', notes: '' });
      
      // Refresh recent uploads after a short delay
      setTimeout(fetchRecentUploads, 2000);

    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStatusBadge = (docStatus: string, procStatus: string) => {
    if (procStatus === 'processing') {
      return <Badge className="bg-accent/10 text-accent border-accent/20 gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
    }
    if (procStatus === 'failed') {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge>;
    }
    if (docStatus === 'approved') {
      return <Badge className="bg-success/10 text-success border-success/20 gap-1"><CheckCircle2 className="h-3 w-3" />Live</Badge>;
    }
    if (docStatus === 'in_review') {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Pending Review</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground">{docStatus}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Documents</h1>
          <p className="text-muted-foreground">
            Add new documents to your knowledge base
            {settings.require_manual_approval 
              ? ' — Manual review required before going live'
              : ' — Documents go live automatically after processing'
            }
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Select Files</CardTitle>
              <CardDescription>Drag and drop or browse files</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragActive ? 'border-accent bg-accent/5' : 'border-border'}`} 
                onDragEnter={handleDrag} 
                onDragLeave={handleDrag} 
                onDragOver={handleDrag} 
                onDrop={handleDrop}
              >
                <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-foreground">Drag and drop files here</p>
                <p className="text-sm text-muted-foreground">or</p>
                <Button variant="outline" className="mt-4" onClick={() => document.getElementById('file-input')?.click()}>
                  Browse files
                </Button>
                <input id="file-input" type="file" multiple accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx" className="hidden" onChange={handleFileSelect} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Supported: PDF, DOCX, TXT, CSV, XLSX, PPTX</p>
              
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Document title" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sensitivity</Label>
                <Select value={formData.sensitivity} onValueChange={(v) => setFormData({ ...formData, sensitivity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENSITIVITY_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." />
              </div>
              <Button className="w-full bg-accent hover:bg-accent/90" onClick={handleUpload} disabled={files.length === 0 || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Documents'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads Section */}
        {recentUploads.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Your latest uploaded documents</CardDescription>
              </div>
              <Link to="/admin/review">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View All & Review
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentUploads.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.document_status, doc.processing_status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
