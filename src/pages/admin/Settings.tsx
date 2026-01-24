import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

interface Settings { 
  company_name: string | null; 
  show_sources_in_answers: boolean; 
  refuse_without_sources: boolean; 
  api_base_url: string | null; 
  require_manual_approval: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({ 
    company_name: '', 
    show_sources_in_answers: true, 
    refuse_without_sources: true, 
    api_base_url: '',
    require_manual_approval: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('company_settings').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setSettings({ 
        company_name: data.company_name || '', 
        show_sources_in_answers: data.show_sources_in_answers, 
        refuse_without_sources: data.refuse_without_sources, 
        api_base_url: data.api_base_url || '',
        require_manual_approval: data.require_manual_approval ?? false,
      });
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('company_settings').update({ 
        company_name: settings.company_name || null, 
        show_sources_in_answers: settings.show_sources_in_answers, 
        refuse_without_sources: settings.refuse_without_sources, 
        api_base_url: settings.api_base_url || null,
        require_manual_approval: settings.require_manual_approval,
      }).eq('user_id', user.id);
      await supabase.from('activity_logs').insert({ user_id: user.id, action: 'Settings Change', details: 'Updated company settings', result: 'Success' });
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout><p className="text-muted-foreground">Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure your knowledge platform</p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input 
                  value={settings.company_name || ''} 
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} 
                  placeholder="Your company name" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Workflow</CardTitle>
              <CardDescription>Configure how uploaded documents are processed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label>Require manual approval</Label>
                    <Badge variant="outline" className="text-xs">
                      {settings.require_manual_approval ? 'ON' : 'OFF'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {settings.require_manual_approval 
                      ? 'Documents require admin review before going live for AI'
                      : 'Documents go live automatically after successful processing'
                    }
                  </p>
                </div>
                <Switch 
                  checked={settings.require_manual_approval} 
                  onCheckedChange={(v) => setSettings({ ...settings, require_manual_approval: v })} 
                />
              </div>
              
              <div className="rounded-lg bg-muted/50 p-3 flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  When manual approval is enabled, uploaded documents will be marked as "Pending Review" 
                  and won't be available to the AI until an admin approves them from the Document Review page.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Behavior</CardTitle>
              <CardDescription>Configure how the AI assistant responds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show sources in answers</Label>
                  <p className="text-sm text-muted-foreground">Display document references with AI responses</p>
                </div>
                <Switch 
                  checked={settings.show_sources_in_answers} 
                  onCheckedChange={(v) => setSettings({ ...settings, show_sources_in_answers: v })} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Refuse without sources</Label>
                  <p className="text-sm text-muted-foreground">Only answer when documents support the response</p>
                </div>
                <Switch 
                  checked={settings.refuse_without_sources} 
                  onCheckedChange={(v) => setSettings({ ...settings, refuse_without_sources: v })} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Connect to external services</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>API Base URL</Label>
                <Input 
                  value={settings.api_base_url || ''} 
                  onChange={(e) => setSettings({ ...settings, api_base_url: e.target.value })} 
                  placeholder="https://api.example.com" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </AdminLayout>
  );
}
