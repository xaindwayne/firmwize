import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Plus,
  ClipboardList,
  Trash2,
  Eye,
  Users,
  Calendar,
  BarChart3,
  GripVertical,
} from 'lucide-react';
import { format } from 'date-fns';

interface Question {
  id: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no';
  text: string;
  options?: string[];
  required: boolean;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  target_type: string;
  target_departments: string[] | null;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  response_count?: number;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Response' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'yes_no', label: 'Yes/No' },
];

const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Legal', 'Compliance', 'Other'];

export default function Questionnaires() {
  const { user } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState('company');
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expiresAt, setExpiresAt] = useState('');

  // New question state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<Question['type']>('text');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchQuestionnaires();
  }, [user]);

  const fetchQuestionnaires = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch response counts
      const withCounts = await Promise.all(
        (data || []).map(async (q) => {
          const { count } = await supabase
            .from('questionnaire_responses')
            .select('id', { count: 'exact', head: true })
            .eq('questionnaire_id', q.id);
          return {
            ...q,
            questions: (Array.isArray(q.questions) ? q.questions : []) as unknown as Question[],
            response_count: count || 0,
          };
        })
      );

      setQuestionnaires(withCounts);
    } catch (error: any) {
      toast.error('Failed to load questionnaires');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (!newQuestionText.trim()) {
      toast.error('Please enter question text');
      return;
    }

    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: newQuestionType,
      text: newQuestionText,
      options: newQuestionType === 'multiple_choice' 
        ? newQuestionOptions.split('\n').filter(o => o.trim()) 
        : undefined,
      required: newQuestionRequired,
    };

    setQuestions([...questions, newQuestion]);
    setNewQuestionText('');
    setNewQuestionOptions('');
    setNewQuestionRequired(true);
    toast.success('Question added');
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleCreate = async () => {
    if (!user || !title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('questionnaires').insert([{
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        questions: questions as unknown as any,
        target_type: targetType,
        target_departments: targetType === 'department' ? targetDepartments : null,
        expires_at: expiresAt || null,
        active: true,
      }]);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'Questionnaire Created',
        details: `Created questionnaire: ${title}`,
        result: 'Success',
      });

      toast.success('Questionnaire created');
      setDialogOpen(false);
      resetForm();
      fetchQuestionnaires();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('questionnaires')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      toast.success(active ? 'Questionnaire deactivated' : 'Questionnaire activated');
      fetchQuestionnaires();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteQuestionnaire = async (id: string) => {
    if (!confirm('Are you sure you want to delete this questionnaire?')) return;

    try {
      const { error } = await supabase.from('questionnaires').delete().eq('id', id);
      if (error) throw error;
      toast.success('Questionnaire deleted');
      fetchQuestionnaires();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetType('company');
    setTargetDepartments([]);
    setQuestions([]);
    setExpiresAt('');
    setNewQuestionText('');
    setNewQuestionType('text');
    setNewQuestionOptions('');
  };

  const viewResponses = (q: Questionnaire) => {
    setSelectedQuestionnaire(q);
    setViewDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Questionnaires</h1>
            <p className="text-muted-foreground">Create surveys and collect employee feedback</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" />
                New Questionnaire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Questionnaire</DialogTitle>
                <DialogDescription>Build a survey to collect employee feedback and alignment data</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Q1 Employee Satisfaction Survey"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this questionnaire..."
                    />
                  </div>
                </div>

                {/* Targeting */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select value={targetType} onValueChange={setTargetType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">All Employees</SelectItem>
                        <SelectItem value="department">Specific Departments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expires On</Label>
                    <Input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                {targetType === 'department' && (
                  <div className="flex flex-wrap gap-2">
                    {DEPARTMENTS.map((dept) => (
                      <Badge
                        key={dept}
                        variant={targetDepartments.includes(dept) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setTargetDepartments(
                            targetDepartments.includes(dept)
                              ? targetDepartments.filter(d => d !== dept)
                              : [...targetDepartments, dept]
                          );
                        }}
                      >
                        {dept}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Questions */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Questions ({questions.length})</Label>
                  
                  {questions.length > 0 && (
                    <div className="space-y-2">
                      {questions.map((q, index) => (
                        <div key={q.id} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Q{index + 1}.</span>
                              <span className="text-sm">{q.text}</span>
                              {q.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {QUESTION_TYPES.find(t => t.value === q.type)?.label}
                              </Badge>
                              {q.options && (
                                <span className="text-xs text-muted-foreground">
                                  {q.options.length} options
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuestion(q.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Question Form */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Add Question</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Input
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          placeholder="Enter your question..."
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select 
                            value={newQuestionType} 
                            onValueChange={(v) => setNewQuestionType(v as Question['type'])}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch
                            checked={newQuestionRequired}
                            onCheckedChange={setNewQuestionRequired}
                          />
                          <Label>Required</Label>
                        </div>
                      </div>
                      {newQuestionType === 'multiple_choice' && (
                        <div className="space-y-2">
                          <Label>Options (one per line)</Label>
                          <Textarea
                            value={newQuestionOptions}
                            onChange={(e) => setNewQuestionOptions(e.target.value)}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            rows={3}
                          />
                        </div>
                      )}
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={addQuestion}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Question
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={creating}
                  className="bg-accent hover:bg-accent/90"
                >
                  {creating ? 'Creating...' : 'Create Questionnaire'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <ClipboardList className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{questionnaires.length}</p>
                  <p className="text-sm text-muted-foreground">Total Surveys</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(142,71%,45%)]/10">
                  <Users className="h-6 w-6 text-[hsl(142,71%,45%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {questionnaires.reduce((sum, q) => sum + (q.response_count || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(217,91%,60%)]/10">
                  <BarChart3 className="h-6 w-6 text-[hsl(217,91%,60%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {questionnaires.filter(q => q.active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Surveys</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questionnaires List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Questionnaires</CardTitle>
            <CardDescription>Manage surveys and view responses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : questionnaires.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No questionnaires yet</h3>
                <p className="text-muted-foreground mt-1">Create your first survey to collect feedback</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionnaires.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{q.title}</p>
                          {q.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {q.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{(q.questions as Question[])?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{q.response_count || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        {q.target_type === 'company' ? (
                          <Badge variant="outline">All</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {q.target_departments?.slice(0, 2).map(d => (
                              <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                            ))}
                            {(q.target_departments?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(q.target_departments?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={q.active}
                          onCheckedChange={() => toggleActive(q.id, q.active)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(q.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewResponses(q)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestionnaire(q.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Responses Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Survey Responses</DialogTitle>
              <DialogDescription>
                {selectedQuestionnaire?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedQuestionnaire?.response_count === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No responses yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedQuestionnaire?.response_count} response(s) collected
                  </p>
                  <Badge variant="secondary">Response analytics coming soon</Badge>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}