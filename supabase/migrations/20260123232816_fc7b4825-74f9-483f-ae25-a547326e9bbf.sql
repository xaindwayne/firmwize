-- Add employee analytics table for usage tracking
CREATE TABLE public.employee_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can view all analytics for their organization
CREATE POLICY "Admins can view analytics"
ON public.employee_analytics
FOR SELECT
USING (has_role(auth.uid(), 'client_admin') OR has_role(auth.uid(), 'platform_admin'));

-- Users can insert their own events
CREATE POLICY "Users can insert their own events"
ON public.employee_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add branding_settings table for platform customization
CREATE TABLE public.branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#7c3aed',
  secondary_color TEXT DEFAULT '#f5f3ff',
  company_tagline TEXT,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own branding
CREATE POLICY "Users can view their own branding"
ON public.branding_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own branding"
ON public.branding_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding"
ON public.branding_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for branding_settings updated_at
CREATE TRIGGER update_branding_settings_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user to also create default branding settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign client_admin role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client_admin');
  
  -- Create default categories for new user
  INSERT INTO public.categories (user_id, name, description) VALUES
    (NEW.id, 'Policies', 'Company policies and guidelines'),
    (NEW.id, 'Processes', 'Standard operating procedures'),
    (NEW.id, 'Onboarding', 'New employee onboarding materials'),
    (NEW.id, 'Templates', 'Document templates and forms'),
    (NEW.id, 'Compliance', 'Regulatory and compliance documents'),
    (NEW.id, 'FAQs', 'Frequently asked questions'),
    (NEW.id, 'Contacts', 'Contact information and directories'),
    (NEW.id, 'Product', 'Product documentation'),
    (NEW.id, 'Other', 'Miscellaneous documents');
  
  -- Create default settings for new user
  INSERT INTO public.company_settings (user_id)
  VALUES (NEW.id);
  
  -- Create default branding settings for new user
  INSERT INTO public.branding_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;