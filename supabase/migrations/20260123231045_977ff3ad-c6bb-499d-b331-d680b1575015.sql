-- Fix overly permissive RLS policies

-- Drop the overly permissive INSERT policy on unanswered_questions
DROP POLICY IF EXISTS "System can insert unanswered questions" ON public.unanswered_questions;

-- Create a more secure policy - only authenticated users can insert their own questions
CREATE POLICY "Users can insert unanswered questions"
ON public.unanswered_questions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- The booking_requests table already has a true policy for public submissions
-- This is intentional for a contact form, but let's make it more explicit
-- by documenting that it's a public endpoint (no change needed, just noting)

-- Update handle_new_user to also assign client_admin role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  RETURN NEW;
END;
$$;