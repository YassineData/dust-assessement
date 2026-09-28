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
      admin_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          google_id: string | null
          id: string
          last_login_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          google_id?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          google_id?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assessment_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["campaign_member_role"]
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["campaign_member_role"]
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["campaign_member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          campaign_name: string | null
          code: string
          company_name: string
          created_at: string
          creator_email: string
          creator_first_name: string
          creator_last_name: string
          id: string
          language: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          campaign_name?: string | null
          code: string
          company_name: string
          created_at?: string
          creator_email: string
          creator_first_name: string
          creator_last_name: string
          id?: string
          language?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          campaign_name?: string | null
          code?: string
          company_name?: string
          created_at?: string
          creator_email?: string
          creator_first_name?: string
          creator_last_name?: string
          id?: string
          language?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_segments: {
        Row: {
          created_at: string
          group_id: string
          id: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          participant_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_segments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "segmentation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_segments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          autoconnect_token: string
          campaign_id: string | null
          company_domain: string | null
          company_name: string
          completed_at: string | null
          created_at: string
          email: string
          first_name: string
          global_score: number | null
          id: string
          item_scores: Json | null
          last_name: string
          profile: Database["public"]["Enums"]["participant_profile"] | null
          responses: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          team: string | null
          updated_at: string
        }
        Insert: {
          autoconnect_token?: string
          campaign_id?: string | null
          company_domain?: string | null
          company_name: string
          completed_at?: string | null
          created_at?: string
          email: string
          first_name: string
          global_score?: number | null
          id?: string
          item_scores?: Json | null
          last_name: string
          profile?: Database["public"]["Enums"]["participant_profile"] | null
          responses?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          team?: string | null
          updated_at?: string
        }
        Update: {
          autoconnect_token?: string
          campaign_id?: string | null
          company_domain?: string | null
          company_name?: string
          completed_at?: string | null
          created_at?: string
          email?: string
          first_name?: string
          global_score?: number | null
          id?: string
          item_scores?: Json | null
          last_name?: string
          profile?: Database["public"]["Enums"]["participant_profile"] | null
          responses?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          team?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentation_groups: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          name_en: string | null
          type_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          name_en?: string | null
          type_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          name_en?: string | null
          type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segmentation_groups_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "segmentation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentation_types: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          name_en: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_en?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segmentation_types_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          access_code: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          access_code: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      template_answers: {
        Row: {
          answer_text: string
          answer_text_en: string | null
          created_at: string
          display_order: number
          id: string
          question_id: string
          score: number
        }
        Insert: {
          answer_text: string
          answer_text_en?: string | null
          created_at?: string
          display_order?: number
          id?: string
          question_id: string
          score?: number
        }
        Update: {
          answer_text?: string
          answer_text_en?: string | null
          created_at?: string
          display_order?: number
          id?: string
          question_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "template_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_required: boolean
          question_text: string
          question_text_en: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          thematic_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          question_text: string
          question_text_en?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          thematic_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          question_text?: string
          question_text_en?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          thematic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_questions_thematic_id_fkey"
            columns: ["thematic_id"]
            isOneToOne: false
            referencedRelation: "template_thematics"
            referencedColumns: ["id"]
          },
        ]
      }
      template_thematics: {
        Row: {
          created_at: string
          description: string | null
          description_en: string | null
          display_order: number
          id: string
          name: string
          name_en: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          name: string
          name_en?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          name?: string
          name_en?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_thematics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_campaign_code: { Args: never; Returns: string }
      has_admin_role: {
        Args: {
          _email: string
          _role: Database["public"]["Enums"]["admin_role"]
        }
        Returns: boolean
      }
      is_admin: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "viewer"
      assessment_status: "not_started" | "in_progress" | "completed"
      assessment_type: "sales" | "generic"
      campaign_member_role: "participant" | "manager" | "admin" | "consultant"
      participant_profile:
        | "traditional"
        | "novice"
        | "curious"
        | "performer"
        | "ambassador"
      question_type:
        | "likert_5"
        | "likert_7"
        | "multiple_choice"
        | "yes_no"
        | "scale_10"
      template_status: "draft" | "active" | "archived"
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
      admin_role: ["super_admin", "admin", "viewer"],
      assessment_status: ["not_started", "in_progress", "completed"],
      assessment_type: ["sales", "generic"],
      campaign_member_role: ["participant", "manager", "admin", "consultant"],
      participant_profile: [
        "traditional",
        "novice",
        "curious",
        "performer",
        "ambassador",
      ],
      question_type: [
        "likert_5",
        "likert_7",
        "multiple_choice",
        "yes_no",
        "scale_10",
      ],
      template_status: ["draft", "active", "archived"],
    },
  },
} as const
