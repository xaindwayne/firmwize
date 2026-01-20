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
      company_settings: {
        Row: {
          api_base_url: string | null
          company_name: string | null
          created_at: string
          departments: string[] | null
          id: string
          refuse_without_sources: boolean | null
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
          show_sources_in_answers?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          category_id: string | null
          created_at: string
          current_version: number | null
          department: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          is_deprecated: boolean | null
          notes: string | null
          region: string | null
          sensitivity: string | null
          source_link: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          current_version?: number | null
          department?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          is_deprecated?: boolean | null
          notes?: string | null
          region?: string | null
          sensitivity?: string | null
          source_link?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          current_version?: number | null
          department?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          is_deprecated?: boolean | null
          notes?: string | null
          region?: string | null
          sensitivity?: string | null
          source_link?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
