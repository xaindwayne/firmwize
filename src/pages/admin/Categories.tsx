import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Category { id: string; name: string; description: string | null; }

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name');
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, [user]);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    try {
      if (editingId) {
        await supabase.from('categories').update({ name, description: description || null }).eq('id', editingId);
        toast.success('Category updated');
      } else {
        await supabase.from('categories').insert({ user_id: user.id, name, description: description || null });
        toast.success('Category created');
      }
      setIsOpen(false);
      setEditingId(null);
      setName('');
      setDescription('');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', id);
    toast.success('Category deleted');
    fetchCategories();
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Categories</h1><p className="text-muted-foreground">Organize your knowledge base</p></div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setEditingId(null); setName(''); setDescription(''); } }}>
            <DialogTrigger asChild><Button className="bg-accent hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" />Add Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" /></div>
                <div><Label>Description (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" /></div>
                <Button onClick={handleSave} className="w-full bg-accent hover:bg-accent/90">{editingId ? 'Update' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? <p className="text-muted-foreground">Loading...</p> : categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              {cat.description && <CardContent><p className="text-sm text-muted-foreground">{cat.description}</p></CardContent>}
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}