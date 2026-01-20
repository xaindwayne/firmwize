-- Create profiles table for admin users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  department TEXT DEFAULT 'Other',
  region TEXT,
  sensitivity TEXT DEFAULT 'Internal' CHECK (sensitivity IN ('Public', 'Internal', 'Restricted')),
  status TEXT DEFAULT 'Uploaded' CHECK (status IN ('Uploaded', 'Indexing', 'Ready', 'Failed')),
  notes TEXT,
  source_link TEXT,
  current_version INTEGER DEFAULT 1,
  is_deprecated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_versions table
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('Upload', 'Rename', 'Recategorize', 'Version Update', 'Deprecate', 'Delete', 'Settings Change')),
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  document_title TEXT,
  details TEXT,
  result TEXT DEFAULT 'Success' CHECK (result IN ('Success', 'Failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking_requests table (for public contact form)
CREATE TABLE public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Scheduled', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_settings table
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  departments TEXT[] DEFAULT ARRAY['HR', 'Finance', 'Operations', 'Sales', 'Legal', 'Compliance', 'Other'],
  show_sources_in_answers BOOLEAN DEFAULT true,
  refuse_without_sources BOOLEAN DEFAULT true,
  api_base_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view their own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- Document versions policies
CREATE POLICY "Users can view versions of their documents"
  ON public.document_versions FOR SELECT
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert versions of their documents"
  ON public.document_versions FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- Activity logs policies
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Booking requests policies (public can insert, only authenticated can view)
CREATE POLICY "Anyone can submit booking requests"
  ON public.booking_requests FOR INSERT
  WITH CHECK (true);

-- Company settings policies
CREATE POLICY "Users can view their own settings"
  ON public.company_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.company_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create storage bucket for knowledge files
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-files', 'knowledge-files', false);

-- Storage policies
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();