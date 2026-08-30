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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          cost_usd: number
          created_at: string | null
          endpoint: string
          id: string
          prompt_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens: number
          cost_usd: number
          created_at?: string | null
          endpoint: string
          id?: string
          prompt_tokens: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string | null
          endpoint?: string
          id?: string
          prompt_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          answer: string
          created_at: string
          full_query_key: string | null
          query_hash: string
        }
        Insert: {
          answer: string
          created_at?: string
          full_query_key?: string | null
          query_hash: string
        }
        Update: {
          answer?: string
          created_at?: string
          full_query_key?: string | null
          query_hash?: string
        }
        Relationships: []
      }
      app_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: number
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: number
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          answer: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          question: string
          title: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          question: string
          title?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          question?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          question: string | null
          reason: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          question?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          question?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cpd_entries: {
        Row: {
          answer: string | null
          duration: number | null
          id: string
          question: string | null
          reflection: string | null
          tags: Json | null
          timestamp: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          duration?: number | null
          id?: string
          question?: string | null
          reflection?: string | null
          tags?: Json | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          answer?: string | null
          duration?: number | null
          id?: string
          question?: string | null
          reflection?: string | null
          tags?: Json | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      drug_doses: {
        Row: {
          condition: string | null
          created_at: string | null
          dose_value: string
          drug_name: string
          duration: string | null
          frequency: string
          id: number
          patient_group: string | null
          route: string | null
          source_id: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          dose_value: string
          drug_name: string
          duration?: string | null
          frequency: string
          id?: number
          patient_group?: string | null
          route?: string | null
          source_id?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          dose_value?: string
          drug_name?: string
          duration?: string | null
          frequency?: string
          id?: number
          patient_group?: string | null
          route?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_doses_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "guideline_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_red_flags: {
        Row: {
          created_at: string | null
          description: string
          drug_name: string
          flag_type: string | null
          id: number
          severity: string | null
          source_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          drug_name: string
          flag_type?: string | null
          id?: number
          severity?: string | null
          source_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          drug_name?: string
          flag_type?: string | null
          id?: number
          severity?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_red_flags_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "guideline_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      guideline_sources: {
        Row: {
          document_name: string
          id: string
          last_checked_at: string | null
          organisation: string
          publication_date: string | null
          url: string | null
          version: string | null
        }
        Insert: {
          document_name: string
          id?: string
          last_checked_at?: string | null
          organisation: string
          publication_date?: string | null
          url?: string | null
          version?: string | null
        }
        Update: {
          document_name?: string
          id?: string
          last_checked_at?: string | null
          organisation?: string
          publication_date?: string | null
          url?: string | null
          version?: string | null
        }
        Relationships: []
      }
      knowledge_base_chunks: {
        Row: {
          char_count: number
          chunk_index: number
          chunk_type: string
          content: string
          created_at: string
          document_type: string
          embedding: string
          header_level: number
          headers: string[]
          id: number
          metadata: Json | null
          original_ref: string | null
          source: string
          source_id: string | null
        }
        Insert: {
          char_count: number
          chunk_index?: number
          chunk_type: string
          content: string
          created_at?: string
          document_type: string
          embedding: string
          header_level?: number
          headers?: string[]
          id?: number
          metadata?: Json | null
          original_ref?: string | null
          source: string
          source_id?: string | null
        }
        Update: {
          char_count?: number
          chunk_index?: number
          chunk_type?: string
          content?: string
          created_at?: string
          document_type?: string
          embedding?: string
          header_level?: number
          headers?: string[]
          id?: number
          metadata?: Json | null
          original_ref?: string | null
          source?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "guideline_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      msf_cycles: {
        Row: {
          created_at: string | null
          custom_questions: Json | null
          executive_summary: string | null
          has_paid: boolean | null
          id: string
          required_responses: number | null
          status: string | null
          stripe_session_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_questions?: Json | null
          executive_summary?: string | null
          has_paid?: boolean | null
          id?: string
          required_responses?: number | null
          status?: string | null
          stripe_session_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_questions?: Json | null
          executive_summary?: string | null
          has_paid?: boolean | null
          id?: string
          required_responses?: number | null
          status?: string | null
          stripe_session_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      msf_questions: {
        Row: {
          created_at: string | null
          cycle_id: string | null
          domain: string
          id: string
          text: string
        }
        Insert: {
          created_at?: string | null
          cycle_id?: string | null
          domain: string
          id?: string
          text: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string | null
          domain?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "msf_questions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "msf_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      msf_responses: {
        Row: {
          additional_comments: string | null
          created_at: string | null
          cycle_id: string
          example_text: string | null
          id: string
          improvements_text: string | null
          role_type: string
          scores: Json
          strengths_text: string | null
        }
        Insert: {
          additional_comments?: string | null
          created_at?: string | null
          cycle_id: string
          example_text?: string | null
          id?: string
          improvements_text?: string | null
          role_type: string
          scores: Json
          strengths_text?: string | null
        }
        Update: {
          additional_comments?: string | null
          created_at?: string | null
          cycle_id?: string
          example_text?: string | null
          id?: string
          improvements_text?: string | null
          role_type?: string
          scores?: Json
          strengths_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "msf_responses_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "msf_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          created_at: string | null
          id: string
          path: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          path: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          path?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pdp_goals: {
        Row: {
          activities: string[] | null
          created_at: string | null
          id: string
          timeline: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activities?: string[] | null
          created_at?: string | null
          id?: string
          timeline?: string | null
          title: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          activities?: string[] | null
          created_at?: string | null
          id?: string
          timeline?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_revisions: {
        Row: {
          content_snapshot: Json
          created_at: string | null
          edited_by: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          content_snapshot: Json
          created_at?: string | null
          edited_by?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          content_snapshot?: Json
          created_at?: string | null
          edited_by?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string | null
          excerpt: string
          id: string
          publish_date: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt: string
          id?: string
          publish_date?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string
          id?: string
          publish_date?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_email: string | null
          acquisition_at: string | null
          acquisition_campaign: string | null
          acquisition_click_id: string | null
          acquisition_content: string | null
          acquisition_medium: string | null
          acquisition_source: string | null
          created_at: string | null
          current_period_end: string | null
          custom_instructions: string | null
          dob: string | null
          email: string | null
          full_name: string | null
          grade: string | null
          id: string
          is_admin: boolean
          is_pro: boolean | null
          opt_in_newsletter: boolean | null
          opt_in_updates: boolean | null
          plan_type: string | null
          recent_languages: string[] | null
          stripe_customer_id: string | null
          subscription_status: string | null
          title: string | null
          updated_at: string | null
          weekly_summary_seen_week: string | null
        }
        Insert: {
          academic_email?: string | null
          acquisition_at?: string | null
          acquisition_campaign?: string | null
          acquisition_click_id?: string | null
          acquisition_content?: string | null
          acquisition_medium?: string | null
          acquisition_source?: string | null
          created_at?: string | null
          current_period_end?: string | null
          custom_instructions?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          grade?: string | null
          id: string
          is_admin?: boolean
          is_pro?: boolean | null
          opt_in_newsletter?: boolean | null
          opt_in_updates?: boolean | null
          plan_type?: string | null
          recent_languages?: string[] | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          title?: string | null
          updated_at?: string | null
          weekly_summary_seen_week?: string | null
        }
        Update: {
          academic_email?: string | null
          acquisition_at?: string | null
          acquisition_campaign?: string | null
          acquisition_click_id?: string | null
          acquisition_content?: string | null
          acquisition_medium?: string | null
          acquisition_source?: string | null
          created_at?: string | null
          current_period_end?: string | null
          custom_instructions?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          grade?: string | null
          id?: string
          is_admin?: boolean
          is_pro?: boolean | null
          opt_in_newsletter?: boolean | null
          opt_in_updates?: boolean | null
          plan_type?: string | null
          recent_languages?: string[] | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          title?: string | null
          updated_at?: string | null
          weekly_summary_seen_week?: string | null
        }
        Relationships: []
      }
      psq_responses: {
        Row: {
          answers: Json
          created_at: string
          id: string
          survey_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          survey_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psq_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "psq_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      psq_surveys: {
        Row: {
          created_at: string
          custom_questions: string[] | null
          executive_summary: string | null
          has_paid: boolean | null
          id: string
          required_responses: number | null
          stripe_session_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_questions?: string[] | null
          executive_summary?: string | null
          has_paid?: boolean | null
          id?: string
          required_responses?: number | null
          stripe_session_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_questions?: string[] | null
          executive_summary?: string | null
          has_paid?: boolean | null
          id?: string
          required_responses?: number | null
          stripe_session_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tool_drafts: {
        Row: {
          input_text: string | null
          last_updated: string | null
          tool_id: string
          user_id: string
        }
        Insert: {
          input_text?: string | null
          last_updated?: string | null
          tool_id: string
          user_id: string
        }
        Update: {
          input_text?: string | null
          last_updated?: string | null
          tool_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_history: {
        Row: {
          created_at: string | null
          id: string
          input: string | null
          output: string | null
          tool_id: string
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          input?: string | null
          output?: string | null
          tool_id: string
          tool_name: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          input?: string | null
          output?: string | null
          tool_id?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          feature: string
          id: string
          last_reset_date: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          feature: string
          id?: string
          last_reset_date?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          feature?: string
          id?: string
          last_reset_date?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      analytics_daily_questions: {
        Row: {
          day: string | null
          total_questions: number | null
          unique_devices: number | null
          unique_logged_in_users: number | null
        }
        Relationships: []
      }
      analytics_daily_traffic: {
        Row: {
          anonymous_devices: number | null
          day: string | null
          known_users: number | null
          total_daily_visitors: number | null
          total_questions: number | null
        }
        Relationships: []
      }
      analytics_user_activity: {
        Row: {
          actions_count: number | null
          activity_date: string | null
          distinct_user_id: string | null
          user_type: string | null
        }
        Relationships: []
      }
      analytics_user_retention: {
        Row: {
          days_active_count: number | null
          first_seen: string | null
          last_seen: string | null
          unique_visitor_id: string | null
          visitor_type: string | null
        }
        Relationships: []
      }
      chunks_by_document: {
        Row: {
          chunk_count: number | null
          chunk_types_used: string[] | null
          document_type: string | null
          first_ingested: string | null
          source: string | null
          total_chars: number | null
        }
        Relationships: []
      }
      top_level_sections: {
        Row: {
          chunk_type: string | null
          content: string | null
          created_at: string | null
          id: number | null
          section_title: string | null
          source: string | null
        }
        Insert: {
          chunk_type?: string | null
          content?: string | null
          created_at?: string | null
          id?: number | null
          section_title?: never
          source?: string | null
        }
        Update: {
          chunk_type?: string | null
          content?: string | null
          created_at?: string | null
          id?: number | null
          section_title?: never
          source?: string | null
        }
        Relationships: []
      }
      umbil_admin_dashboard: {
        Row: {
          total_cpd_entries: number | null
          total_profiles: number | null
          total_tools_used: number | null
          total_weekly_ai_cost: number | null
          total_weekly_questions_asked: number | null
          total_weekly_visits: number | null
        }
        Relationships: []
      }
      v_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
        }
        Relationships: []
      }
      weekly_analytics_summary: {
        Row: {
          avg_daily_questions: number | null
          avg_daily_questions_weekdays: number | null
          avg_daily_visits: number | null
          avg_daily_visits_weekdays: number | null
          total_weekly_questions: number | null
          total_weekly_visits: number | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analytics_engagement_payload: {
        Args: never
        Returns: Json
      }
      analytics_growth_funnel: {
        Args: never
        Returns: Json
      }
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      get_user_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          first_question: string
          last_active: string
        }[]
      }
      hybrid_search_chunks: {
        Args: {
          filter_chunk_types?: string[]
          filter_header_contains?: string
          filter_source?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_type: string
          content: string
          document_type: string
          headers: string[]
          id: number
          metadata: Json
          similarity: number
          source: string
        }[]
      }
      match_docs:
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              content: string
              document_type: string
              id: number
              similarity: number
              source: string
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
              query_text: string
            }
            Returns: {
              content: string
              document_type: string
              id: number
              original_ref: string
              similarity: number
              source: string
            }[]
          }
      match_knowledge_base_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          char_count: number
          chunk_index: number
          chunk_type: string
          content: string
          created_at: string
          document_type: string
          header_level: number
          headers: string[]
          id: number
          metadata: Json
          original_ref: string
          similarity: number
          source: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
