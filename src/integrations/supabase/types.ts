export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          document_id: string | null
          document_title: string | null
          id: string
          result: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          document_id?: string | null
          document_title?: string | null
          id?: string
          result?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          document_id?: string | null
          document_title?: string | null
          id?: string
          result?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          status: string | null
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          status?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          company_tagline: string | null
          created_at: string
          custom_css: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_tagline?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_tagline?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          sources: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          sources?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          api_base_url: string | null
          company_name: string | null
          created_at: string
          departments: string[] | null
          id: string
          refuse_without_sources: boolean | null
          require_manual_approval: boolean | null
          show_sources_in_answers: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_base_url?: string | null
          company_name?: string | null
          created_at?: string
          departments?: string[] | null
          id?: string
          refuse_without_sources?: boolean | null
          require_manual_approval?: boolean | null
          show_sources_in_answers?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_base_url?: string | null
          company_name?: string | null
          created_at?: string
          departments?: string[] | null
          id?: string
          refuse_without_sources?: boolean | null
          require_manual_approval?: boolean | null
          show_sources_in_answers?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          user_id: string
        }
        Insert: {
          chunk_index?: number
          chunk_text: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          file_path: string
          file_size: number | null
          id: string
          notes: string | null
          uploaded_by: string
          version_number: number
        }
        Insert: {
          created_at?: string
          document_id: string
          file_path: string
          file_size?: number | null
          id?: string
          notes?: string | null
          uploaded_by: string
          version_number: number
        }
        Update: {
          created_at?: string
          document_id?: string
          file_path?: string
          file_size?: number | null
          id?: string
          notes?: string | null
          uploaded_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_enabled: boolean | null
          category_id: string | null
          chunk_count: number | null
          content_text: string | null
          created_at: string
          current_version: number | null
          department: string | null
          document_status: Database["public"]["Enums"]["document_status"] | null
          expires_at: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          is_deprecated: boolean | null
          knowledge_type: Database["public"]["Enums"]["knowledge_type"] | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          notes: string | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string | null
          questions_answered: string | null
          region: string | null
          role_relevance: string[] | null
          sensitivity: string | null
          source_link: string | null
          status: string | null
          team: string | null
          title: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_level"] | null
        }
        Insert: {
          ai_enabled?: boolean | null
          category_id?: string | null
          chunk_count?: number | null
          content_text?: string | null
          created_at?: string
          current_version?: number | null
          department?: string | null
          document_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
          expires_at?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          is_deprecated?: boolean | null
          knowledge_type?: Database["public"]["Enums"]["knowledge_type"] | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          notes?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          questions_answered?: string | null
          region?: string | null
          role_relevance?: string[] | null
          sensitivity?: string | null
          source_link?: string | null
          status?: string | null
          team?: string | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_level"] | null
        }
        Update: {
          ai_enabled?: boolean | null
          category_id?: string | null
          chunk_count?: number | null
          content_text?: string | null
          created_at?: string
          current_version?: number | null
          department?: string | null
          document_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
          expires_at?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          is_deprecated?: boolean | null
          knowledge_type?: Database["public"]["Enums"]["knowledge_type"] | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          notes?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          questions_answered?: string | null
          region?: string | null
          role_relevance?: string[] | null
          sensitivity?: string | null
          source_link?: string | null
          status?: string | null
          team?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_analytics: {
        Row: {
          created_at: string
          department: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_requests: {
        Row: {
          created_at: string
          department: string | null
          id: string
          question: string
          resolution_answer: string | null
          resolution_document_id: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          question: string
          resolution_answer?: string | null
          resolution_document_id?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          question?: string
          resolution_answer?: string | null
          resolution_document_id?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_requests_resolution_document_id_fkey"
            columns: ["resolution_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          notice_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          notice_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          notice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_acknowledgments_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "priority_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_notices: {
        Row: {
          active: boolean | null
          content: string
          created_at: string
          expires_at: string | null
          id: string
          priority: string | null
          requires_acknowledgment: boolean | null
          target_departments: string[] | null
          target_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          priority?: string | null
          requires_acknowledgment?: boolean | null
          target_departments?: string[] | null
          target_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          priority?: string | null
          requires_acknowledgment?: boolean | null
          target_departments?: string[] | null
          target_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          created_at: string
          department: string | null
          id: string
          questionnaire_id: string
          responses: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          questionnaire_id: string
          responses: Json
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          questionnaire_id?: string
          responses?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          questions: Json
          target_departments: string[] | null
          target_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          questions?: Json
          target_departments?: string[] | null
          target_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          questions?: Json
          target_departments?: string[] | null
          target_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      unanswered_questions: {
        Row: {
          addressed: boolean | null
          addressed_at: string | null
          addressed_by_document_id: string | null
          created_at: string
          department: string | null
          id: string
          question: string
          user_id: string
        }
        Insert: {
          addressed?: boolean | null
          addressed_at?: string | null
          addressed_by_document_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          question: string
          user_id: string
        }
        Update: {
          addressed?: boolean | null
          addressed_at?: string | null
          addressed_by_document_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unanswered_questions_addressed_by_document_id_fkey"
            columns: ["addressed_by_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_document_embeddings: {
        Args: {
          p_match_count?: number
          p_match_threshold?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          chunk_text: string
          department: string
          document_id: string
          document_title: string
          id: string
          similarity: number
        }[]
      }
      search_user_documents: {
        Args: { p_limit?: number; p_query: string; p_user_id: string }
        Returns: {
          department: string
          excerpt: string
          id: string
          knowledge_type: string
          rank: number
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "platform_admin" | "client_admin" | "employee"
      document_status: "draft" | "in_review" | "approved" | "deprecated"
      knowledge_type:
        | "process_sop"
        | "policy"
        | "training"
        | "faq"
        | "template"
        | "contacts"
        | "external_source"
        | "custom"
      visibility_level: "company_wide" | "department_only" | "restricted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["platform_admin", "client_admin", "employee"],
      document_status: ["draft", "in_review", "approved", "deprecated"],
      knowledge_type: [
        "process_sop",
        "policy",
        "training",
        "faq",
        "template",
        "contacts",
        "external_source",
        "custom",
      ],
      visibility_level: ["company_wide", "department_only", "restricted"],
    },
  },
} as const
