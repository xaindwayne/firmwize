import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Upload as UploadIcon, FileText, X, CheckCircle2 } from 'lucide-react';

const SUPPORTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Legal', 'Compliance', 'Other'];
const SENSITIVITY_LEVELS = ['Public', 'Internal', 'Restricted'];

interface Category { id: string; name: string; }

export default function UploadPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', categoryId: '', department: 'Other', region: '', sensitivity: 'Internal', notes: '' });
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('categories').select('id, name').eq('user_id', user.id).then(({ data }) => setCategories(data || []));
    }
  }, [user]);

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

  const handleUpload = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('knowledge-files').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from('documents').insert({
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
          status: 'Ready',
        });
        if (dbError) throw dbError;

        await supabase.from('activity_logs').insert({ user_id: user.id, action: 'Upload', document_title: formData.title || file.name, details: `Uploaded ${file.name}`, result: 'Success' });
      }
      toast.success('Files uploaded successfully!');
      setFiles([]);
      setFormData({ title: '', categoryId: '', department: 'Other', region: '', sensitivity: 'Internal', notes: '' });
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Documents</h1>
          <p className="text-muted-foreground">Add new documents to your knowledge base</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Select Files</CardTitle><CardDescription>Drag and drop or browse files</CardDescription></CardHeader>
            <CardContent>
              <div className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragActive ? 'border-accent bg-accent/5' : 'border-border'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-foreground">Drag and drop files here</p>
                <p className="text-sm text-muted-foreground">or</p>
                <Button variant="outline" className="mt-4" onClick={() => document.getElementById('file-input')?.click()}>Browse files</Button>
                <input id="file-input" type="file" multiple accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx" className="hidden" onChange={handleFileSelect} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Supported: PDF, DOCX, TXT, CSV, XLSX, PPTX</p>
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="text-sm">{file.name}</span></div>
                      <Button variant="ghost" size="sm" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Document Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Document title" /></div>
              <div><Label>Category</Label><Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Department</Label><Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Sensitivity</Label><Select value={formData.sensitivity} onValueChange={(v) => setFormData({ ...formData, sensitivity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SENSITIVITY_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Notes (optional)</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." /></div>
              <Button className="w-full bg-accent hover:bg-accent/90" onClick={handleUpload} disabled={files.length === 0 || uploading}>{uploading ? 'Uploading...' : 'Upload Documents'}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}