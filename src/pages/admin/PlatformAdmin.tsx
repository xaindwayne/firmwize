import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Palette, Image, Type, Users, Shield, Settings2 } from 'lucide-react';

interface BrandingSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  company_tagline: string | null;
  custom_css: string | null;
}

export default function PlatformAdmin() {
  const { user } = useAuth();
  const { isPlatformAdmin, isClientAdmin, isLoading: roleLoading } = useUserRole();
  const [branding, setBranding] = useState<BrandingSettings>({
    logo_url: '',
    primary_color: '#7c3aed',
    secondary_color: '#f5f3ff',
    company_tagline: '',
    custom_css: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchBranding();
  }, [user]);

  const fetchBranding = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setBranding({
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#7c3aed',
        secondary_color: data.secondary_color || '#f5f3ff',
        company_tagline: data.company_tagline || '',
        custom_css: data.custom_css || '',
      });
    } else if (!error) {
      // Create default branding if none exists
      await supabase.from('branding_settings').insert({ user_id: user.id });
    }
    setLoading(false);
  };

  const handleSaveBranding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('branding_settings')
        .update({
          logo_url: branding.logo_url || null,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          company_tagline: branding.company_tagline || null,
          custom_css: branding.custom_css || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'Branding Update',
        details: 'Updated platform branding settings',
        result: 'Success',
      });

      toast.success('Branding settings saved');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isPlatformAdmin && !isClientAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Administration</h1>
            <p className="text-muted-foreground">Customize branding, UI, and platform settings</p>
          </div>
          <Badge variant="outline" className="text-accent border-accent">
            {isPlatformAdmin ? 'Platform Admin' : 'Client Admin'}
          </Badge>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2" disabled={!isPlatformAdmin}>
              <Users className="h-4 w-4" />
              Clients
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-accent" />
                    Logo & Identity
                  </CardTitle>
                  <CardDescription>Upload your company logo and set your brand tagline</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={branding.logo_url || ''}
                      onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                    {branding.logo_url && (
                      <div className="mt-2 p-4 bg-muted rounded-lg">
                        <img
                          src={branding.logo_url}
                          alt="Logo preview"
                          className="h-12 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Company Tagline</Label>
                    <Input
                      value={branding.company_tagline || ''}
                      onChange={(e) => setBranding({ ...branding, company_tagline: e.target.value })}
                      placeholder="Your company slogan or tagline"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-accent" />
                    Brand Colors
                  </CardTitle>
                  <CardDescription>Customize your platform's color scheme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={branding.primary_color}
                        onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={branding.primary_color}
                        onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                        placeholder="#7c3aed"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={branding.secondary_color}
                        onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={branding.secondary_color}
                        onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                        placeholder="#f5f3ff"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg border" style={{ background: branding.secondary_color }}>
                    <p style={{ color: branding.primary_color }} className="font-medium">
                      Preview: This is how your brand colors look together
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-accent" />
                  Custom CSS
                </CardTitle>
                <CardDescription>Add custom CSS to further customize your platform's appearance (advanced)</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={branding.custom_css || ''}
                  onChange={(e) => setBranding({ ...branding, custom_css: e.target.value })}
                  placeholder=".my-custom-class { ... }"
                  className="font-mono text-sm min-h-[150px]"
                />
              </CardContent>
            </Card>

            <Button 
              onClick={handleSaveBranding} 
              disabled={saving} 
              className="bg-accent hover:bg-accent/90"
            >
              {saving ? 'Saving...' : 'Save Branding Settings'}
            </Button>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>UI Customization</CardTitle>
                <CardDescription>Configure how the platform looks and feels for your users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-medium">Chat Interface</h4>
                    <p className="text-sm text-muted-foreground">Configure the AI chat widget appearance</p>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-medium">Document Viewer</h4>
                    <p className="text-sm text-muted-foreground">Customize document display settings</p>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-medium">Email Templates</h4>
                    <p className="text-sm text-muted-foreground">Customize notification emails</p>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-medium">Widget Embedding</h4>
                    <p className="text-sm text-muted-foreground">Embed chat widget on external sites</p>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Client Management
                </CardTitle>
                <CardDescription>View and manage client accounts (Platform Admin only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Client Management</h3>
                  <p className="text-muted-foreground mt-1">
                    Multi-tenant client management coming soon
                  </p>
                  <Badge variant="secondary" className="mt-4">Enterprise Feature</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}