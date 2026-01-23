import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileText, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const KNOWLEDGE_TYPES = [
  { value: 'process_sop', label: 'Process / SOP' },
  { value: 'policy', label: 'Policy' },
  { value: 'training', label: 'Training' },
  { value: 'faq', label: 'FAQ' },
  { value: 'template', label: 'Template' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'external_source', label: 'External Source' },
  { value: 'custom', label: 'Custom' },
] as const;

const DEPARTMENTS = [
  { value: 'HR', label: 'HR' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Compliance', label: 'Compliance' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Other', label: 'Other' },
] as const;

const VISIBILITY_LEVELS = [
  { value: 'company_wide', label: 'Company-wide', description: 'Visible to all employees' },
  { value: 'department_only', label: 'Department Only', description: 'Visible to selected department' },
  { value: 'restricted', label: 'Restricted', description: 'Admin-only access' },
] as const;

const SENSITIVITY_LEVELS = [
  { value: 'Public', label: 'Public' },
  { value: 'Internal', label: 'Internal' },
  { value: 'Restricted', label: 'Restricted' },
] as const;

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  knowledgeType: z.string().min(1, 'Knowledge type is required'),
  department: z.string().min(1, 'Department is required'),
  visibility: z.string().default('company_wide'),
  sensitivity: z.string().default('Internal'),
  categoryId: z.string().optional(),
  region: z.string().optional(),
  team: z.string().optional(),
  roleRelevance: z.string().optional(),
  questionsAnswered: z.string().optional(),
  notes: z.string().optional(),
  externalLink: z.string().url().optional().or(z.literal('')),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface Category {
  id: string;
  name: string;
}

interface UnifiedUploadFormProps {
  categories: Category[];
  onSubmit: (data: UploadFormValues, files: File[]) => Promise<void>;
  isUploading?: boolean;
}

export function UnifiedUploadForm({ categories, onSubmit, isUploading }: UnifiedUploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      knowledgeType: '',
      department: '',
      visibility: 'company_wide',
      sensitivity: 'Internal',
      categoryId: '',
      region: '',
      team: '',
      roleRelevance: '',
      questionsAnswered: '',
      notes: '',
      externalLink: '',
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    // Auto-fill title from first file if empty
    if (acceptedFiles.length > 0 && !form.getValues('title')) {
      const fileName = acceptedFiles[0].name.replace(/\.[^/.]+$/, '');
      form.setValue('title', fileName);
    }
  }, [form]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (data: UploadFormValues) => {
    await onSubmit(data, files);
    form.reset();
    setFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Upload Type Tabs */}
        <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as 'file' | 'link')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              External Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "relative rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
                isDragActive 
                  ? "border-accent bg-accent/5" 
                  : "border-border hover:border-accent/50 hover:bg-muted/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <Upload className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {isDragActive ? "Drop files here" : "Drag & drop files here"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    or click to browse • PDF, DOCX, XLSX, PPTX, TXT, CSV • Max 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="link" className="mt-4">
            <FormField
              control={form.control}
              name="externalLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External Link URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Link to an authorized external source (read-only access)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        {/* Required Fields */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Required Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter document title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="knowledgeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Knowledge Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KNOWLEDGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Visibility & Access */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Visibility & Access</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISIBILITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <span>{level.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {level.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sensitivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sensitivity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sensitivity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SENSITIVITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region / Team (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., EMEA, Engineering" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Context Fields */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Context & Discoverability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="questionsAnswered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What questions does this help answer?</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., How do I submit a vacation request? What is the expense policy?"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Add questions this document can answer to improve AI search accuracy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Internal notes about this document..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Notes visible only to admins, not included in AI responses
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          disabled={isUploading || (uploadType === 'file' && files.length === 0)}
          className="w-full bg-accent hover:bg-accent/90"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload to Knowledge Base
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}