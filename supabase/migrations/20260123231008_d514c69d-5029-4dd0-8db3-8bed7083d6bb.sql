-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('platform_admin', 'client_admin', 'employee');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Create knowledge_type enum
CREATE TYPE public.knowledge_type AS ENUM (
  'process_sop', 'policy', 'training', 'faq', 'template', 'contacts', 'external_source', 'custom'
);

-- Create document_status enum
CREATE TYPE public.document_status AS ENUM ('draft', 'in_review', 'approved', 'deprecated');

-- Create visibility enum
CREATE TYPE public.visibility_level AS ENUM ('company_wide', 'department_only', 'restricted');

-- Add new columns to documents table
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS knowledge_type knowledge_type DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS document_status document_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS visibility visibility_level DEFAULT 'company_wide',
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS role_relevance TEXT[],
  ADD COLUMN IF NOT EXISTS questions_answered TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_text TEXT;

-- Create knowledge_requests table
CREATE TABLE public.knowledge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    question TEXT NOT NULL,
    department TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved')),
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_type TEXT CHECK (resolution_type IN ('linked_document', 'new_document', 'written_answer')),
    resolution_document_id UUID REFERENCES public.documents(id),
    resolution_answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create knowledge requests"
ON public.knowledge_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
ON public.knowledge_requests FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admins can update requests"
ON public.knowledge_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'platform_admin'));

-- Create priority_notices table
CREATE TABLE public.priority_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_type TEXT DEFAULT 'company' CHECK (target_type IN ('company', 'department')),
    target_departments TEXT[],
    requires_acknowledgment BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.priority_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notices"
ON public.priority_notices FOR ALL
USING (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view active notices"
ON public.priority_notices FOR SELECT
USING (active = true);

-- Create notice_acknowledgments table
CREATE TABLE public.notice_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notice_id UUID REFERENCES public.priority_notices(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (notice_id, user_id)
);

ALTER TABLE public.notice_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can acknowledge notices"
ON public.notice_acknowledgments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their acknowledgments"
ON public.notice_acknowledgments FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'client_admin'));

-- Create questionnaires table
CREATE TABLE public.questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',
    target_type TEXT DEFAULT 'company' CHECK (target_type IN ('company', 'department')),
    target_departments TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage questionnaires"
ON public.questionnaires FOR ALL
USING (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view active questionnaires"
ON public.questionnaires FOR SELECT
USING (active = true);

-- Create questionnaire_responses table
CREATE TABLE public.questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    department TEXT,
    responses JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit responses"
ON public.questionnaire_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view aggregated responses"
ON public.questionnaire_responses FOR SELECT
USING (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'platform_admin'));

-- Create chat_conversations table for AI chat history
CREATE TABLE public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their conversations"
ON public.chat_conversations FOR ALL
USING (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their messages"
ON public.chat_messages FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = chat_messages.conversation_id 
    AND user_id = auth.uid()
));

-- Create unanswered_questions table for gap analysis
CREATE TABLE public.unanswered_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    question TEXT NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    addressed BOOLEAN DEFAULT false,
    addressed_at TIMESTAMP WITH TIME ZONE,
    addressed_by_document_id UUID REFERENCES public.documents(id)
);

ALTER TABLE public.unanswered_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert unanswered questions"
ON public.unanswered_questions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view and manage unanswered questions"
ON public.unanswered_questions FOR ALL
USING (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'platform_admin'));

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_knowledge_requests_updated_at
BEFORE UPDATE ON public.knowledge_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_priority_notices_updated_at
BEFORE UPDATE ON public.priority_notices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assign client_admin role to existing users (they created accounts before roles existed)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'client_admin'::app_role FROM auth.users
ON CONFLICT DO NOTHING;