// Este arquivo é GERADO pelo Supabase CLI.
// Execute: pnpm db:types para atualizar.
// Atualizado manualmente para incluir tabelas das migrations 0012–0016
// enquanto o CLI não está autenticado no ambiente local.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string
          email: string
          full_name: string | null
          role: 'admin' | 'seller'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email: string
          full_name?: string | null
          role: 'admin' | 'seller'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'seller'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          id: string
          organization_id: string
          created_by: string | null
          company_id: string | null
          customer_id: string | null
          behavior_style_id: string | null
          name: string
          description: string | null
          buyer_role: string | null
          industry: string | null
          company_size: string | null
          pain_points: string | null
          objections: string | null
          budget_context: string | null
          decision_authority: string | null
          personality_traits: string | null
          communication_style: string | null
          product_context: string | null
          visible_briefing: string | null
          visit_objective: string | null
          success_criteria: string | null
          confidential_context: string | null
          sales_process_context: string | null
          sales_competencies_context: string | null
          market_situation: string | null
          competition_context: string | null
          marketing_strategy: string | null
          scenario_type: string | null
          difficulty_level: 'easy' | 'medium' | 'hard' | 'trainee_choice' | null
          chat_model: string | null
          available_objectives: string[] | null
          system_prompt: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          created_by?: string | null
          company_id?: string | null
          customer_id?: string | null
          behavior_style_id?: string | null
          name: string
          description?: string | null
          buyer_role?: string | null
          industry?: string | null
          company_size?: string | null
          pain_points?: string | null
          objections?: string | null
          budget_context?: string | null
          decision_authority?: string | null
          personality_traits?: string | null
          communication_style?: string | null
          product_context?: string | null
          visible_briefing?: string | null
          visit_objective?: string | null
          success_criteria?: string | null
          confidential_context?: string | null
          sales_process_context?: string | null
          sales_competencies_context?: string | null
          market_situation?: string | null
          competition_context?: string | null
          marketing_strategy?: string | null
          scenario_type?: string | null
          difficulty_level?: 'easy' | 'medium' | 'hard' | 'trainee_choice' | null
          chat_model?: string | null
          available_objectives?: string[] | null
          system_prompt: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string | null
          company_id?: string | null
          customer_id?: string | null
          behavior_style_id?: string | null
          name?: string
          description?: string | null
          buyer_role?: string | null
          industry?: string | null
          company_size?: string | null
          pain_points?: string | null
          objections?: string | null
          budget_context?: string | null
          decision_authority?: string | null
          personality_traits?: string | null
          communication_style?: string | null
          product_context?: string | null
          visible_briefing?: string | null
          visit_objective?: string | null
          success_criteria?: string | null
          confidential_context?: string | null
          sales_process_context?: string | null
          sales_competencies_context?: string | null
          market_situation?: string | null
          competition_context?: string | null
          marketing_strategy?: string | null
          scenario_type?: string | null
          difficulty_level?: 'easy' | 'medium' | 'hard' | 'trainee_choice' | null
          chat_model?: string | null
          available_objectives?: string[] | null
          system_prompt?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenario_companies: {
        Row: {
          id: string
          organization_id: string
          created_by: string | null
          name: string
          description: string | null
          industry: string | null
          company_size: string | null
          products_services: Json
          product_context: string | null
          market_situation: string | null
          competition_context: string | null
          marketing_strategy: string | null
          join_code: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          created_by?: string | null
          name: string
          description?: string | null
          industry?: string | null
          company_size?: string | null
          products_services?: Json
          product_context?: string | null
          market_situation?: string | null
          competition_context?: string | null
          marketing_strategy?: string | null
          join_code?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string | null
          name?: string
          description?: string | null
          industry?: string | null
          company_size?: string | null
          products_services?: Json
          product_context?: string | null
          market_situation?: string | null
          competition_context?: string | null
          marketing_strategy?: string | null
          join_code?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenario_customers: {
        Row: {
          id: string
          organization_id: string
          created_by: string | null
          name: string
          description: string | null
          buyer_role: string | null
          pain_points: string | null
          objections: string | null
          budget_context: string | null
          decision_authority: string | null
          personality_traits: string | null
          communication_style: string | null
          confidential_context: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          created_by?: string | null
          name: string
          description?: string | null
          buyer_role?: string | null
          pain_points?: string | null
          objections?: string | null
          budget_context?: string | null
          decision_authority?: string | null
          personality_traits?: string | null
          communication_style?: string | null
          confidential_context?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string | null
          name?: string
          description?: string | null
          buyer_role?: string | null
          pain_points?: string | null
          objections?: string | null
          budget_context?: string | null
          decision_authority?: string | null
          personality_traits?: string | null
          communication_style?: string | null
          confidential_context?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      behavior_styles: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string
          simulation_guidance: string
          evaluation_criteria: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description: string
          simulation_guidance: string
          evaluation_criteria?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string
          simulation_guidance?: string
          evaluation_criteria?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          id: string
          customer_profile_id: string
          seller_id: string
          organization_id: string
          title: string | null
          status: 'active' | 'completed' | 'abandoned'
          started_at: string
          ended_at: string | null
          total_tokens: number
          behavior_style_id: string | null
          outcome: 'accepted' | 'rejected' | 'ended_by_errors' | null
          difficulty_level: 'easy' | 'medium' | 'hard' | null
          chosen_objective: string | null
        }
        Insert: {
          id?: string
          customer_profile_id: string
          seller_id: string
          organization_id: string
          title?: string | null
          status?: 'active' | 'completed' | 'abandoned'
          started_at?: string
          ended_at?: string | null
          total_tokens?: number
          behavior_style_id?: string | null
          outcome?: 'accepted' | 'rejected' | 'ended_by_errors' | null
          difficulty_level?: 'easy' | 'medium' | 'hard' | null
          chosen_objective?: string | null
        }
        Update: {
          id?: string
          customer_profile_id?: string
          seller_id?: string
          organization_id?: string
          title?: string | null
          status?: 'active' | 'completed' | 'abandoned'
          started_at?: string
          ended_at?: string | null
          total_tokens?: number
          behavior_style_id?: string | null
          outcome?: 'accepted' | 'rejected' | 'ended_by_errors' | null
          difficulty_level?: 'easy' | 'medium' | 'hard' | null
          chosen_objective?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          tokens: number | null
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          tokens?: number | null
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          tokens?: number | null
          model_used?: string | null
          created_at?: string
        }
        Relationships: []
      }
      session_feedback: {
        Row: {
          id: string
          session_id: string
          overall_score: number | null
          strengths: string | null
          improvements: string | null
          techniques_used: string[] | null
          techniques_missed: string[] | null
          competency_scores: Json | null
          raw_evaluation: Json | null
          model_used: string | null
          generated_by: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          overall_score?: number | null
          strengths?: string | null
          improvements?: string | null
          techniques_used?: string[] | null
          techniques_missed?: string[] | null
          competency_scores?: Json | null
          raw_evaluation?: Json | null
          model_used?: string | null
          generated_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          overall_score?: number | null
          strengths?: string | null
          improvements?: string | null
          techniques_used?: string[] | null
          techniques_missed?: string[] | null
          competency_scores?: Json | null
          raw_evaluation?: Json | null
          model_used?: string | null
          generated_by?: string
          created_at?: string
        }
        Relationships: []
      }
      company_knowledge_docs: {
        Row: {
          id: string
          organization_id: string
          company_id: string
          title: string
          source_type: 'pdf' | 'url' | 'text'
          source_url: string | null
          extracted_text: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          company_id: string
          title: string
          source_type: 'pdf' | 'url' | 'text'
          source_url?: string | null
          extracted_text?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          company_id?: string
          title?: string
          source_type?: 'pdf' | 'url' | 'text'
          source_url?: string | null
          extracted_text?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_companies: {
        Row: {
          seller_id: string
          company_id: string
          organization_id: string
          created_at: string
        }
        Insert: {
          seller_id: string
          company_id: string
          organization_id: string
          created_at?: string
        }
        Update: {
          seller_id?: string
          company_id?: string
          organization_id?: string
          created_at?: string
        }
        Relationships: []
      }
      seller_customer_history: {
        Row: {
          id: string
          organization_id: string
          seller_id: string
          customer_id: string
          history_text: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          seller_id: string
          customer_id: string
          history_text: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          seller_id?: string
          customer_id?: string
          history_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      evaluation_criteria: {
        Row: {
          id: string
          organization_id: string
          company_id: string
          name: string
          stages: Json
          total_points: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          company_id: string
          name: string
          stages: Json
          total_points?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          company_id?: string
          name?: string
          stages?: Json
          total_points?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_session_tokens: {
        Args: { p_session_id: string; p_tokens: number }
        Returns: undefined
      }
      join_project_by_code: {
        Args: { p_code: string }
        Returns: Json
      }
      get_project_by_join_code: {
        Args: { p_code: string }
        Returns: { id: string; name: string }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
