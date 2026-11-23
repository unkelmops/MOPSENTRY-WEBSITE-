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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_access_entitlements: {
        Row: {
          enabled: boolean
          granted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          granted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          granted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ea_commands: {
        Row: {
          command: string
          command_status: string | null
          created_at: string | null
          ea_id: string
          executed_at: string | null
          id: number
        }
        Insert: {
          command: string
          command_status?: string | null
          created_at?: string | null
          ea_id: string
          executed_at?: string | null
          id?: number
        }
        Update: {
          command?: string
          command_status?: string | null
          created_at?: string | null
          ea_id?: string
          executed_at?: string | null
          id?: number
        }
        Relationships: []
      }
      ea_status: {
        Row: {
          balance: number | null
          ea_id: string
          equity: number | null
          status: string
          symbol: string | null
          update_at: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          ea_id: string
          equity?: number | null
          status: string
          symbol?: string | null
          update_at?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          ea_id?: string
          equity?: number | null
          status?: string
          symbol?: string | null
          update_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fundamental_event_history: {
        Row: {
          actual_recorded_at: string | null
          actual_value: string
          currency: string
          event_id: string
          event_status: string
          event_time: string
          first_seen_at: string
          forecast_value: string
          impact: string
          last_seen_at: string
          period: string | null
          previous_value: string
          series_key: string
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_recorded_at?: string | null
          actual_value?: string
          currency: string
          event_id: string
          event_status?: string
          event_time: string
          first_seen_at?: string
          forecast_value?: string
          impact: string
          last_seen_at?: string
          period?: string | null
          previous_value?: string
          series_key: string
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_recorded_at?: string | null
          actual_value?: string
          currency?: string
          event_id?: string
          event_status?: string
          event_time?: string
          first_seen_at?: string
          forecast_value?: string
          impact?: string
          last_seen_at?: string
          period?: string | null
          previous_value?: string
          series_key?: string
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fundamental_sync_state: {
        Row: {
          id: string
          last_synced_at: string
        }
        Insert: {
          id: string
          last_synced_at?: string
        }
        Update: {
          id?: string
          last_synced_at?: string
        }
        Relationships: []
      }
      market_candles: {
        Row: {
          candle_open_at: string
          close: number
          high: number
          instrument_symbol: string
          low: number
          open: number
          provider_symbol: string
          received_at: string
          source: string
          spread: number | null
          tick_volume: number | null
          timeframe: string
        }
        Insert: {
          candle_open_at: string
          close: number
          high: number
          instrument_symbol: string
          low: number
          open: number
          provider_symbol: string
          received_at?: string
          source: string
          spread?: number | null
          tick_volume?: number | null
          timeframe: string
        }
        Update: {
          candle_open_at?: string
          close?: number
          high?: number
          instrument_symbol?: string
          low?: number
          open?: number
          provider_symbol?: string
          received_at?: string
          source?: string
          spread?: number | null
          tick_volume?: number | null
          timeframe?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_candles_instrument_symbol_fkey"
            columns: ["instrument_symbol"]
            isOneToOne: false
            referencedRelation: "market_instruments"
            referencedColumns: ["symbol"]
          },
        ]
      }
      market_data_health: {
        Row: {
          error_code: string | null
          instrument_symbol: string
          last_success_at: string | null
          last_tick_at: string | null
          latency_ms: number | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          error_code?: string | null
          instrument_symbol?: string
          last_success_at?: string | null
          last_tick_at?: string | null
          latency_ms?: number | null
          source: string
          status: string
          updated_at?: string
        }
        Update: {
          error_code?: string | null
          instrument_symbol?: string
          last_success_at?: string | null
          last_tick_at?: string | null
          latency_ms?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_instrument_symbols: {
        Row: {
          created_at: string
          id: string
          instrument_symbol: string
          is_verified: boolean
          provider: string
          provider_symbol: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instrument_symbol: string
          is_verified?: boolean
          provider: string
          provider_symbol: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instrument_symbol?: string
          is_verified?: boolean
          provider?: string
          provider_symbol?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_instrument_symbols_instrument_symbol_fkey"
            columns: ["instrument_symbol"]
            isOneToOne: false
            referencedRelation: "market_instruments"
            referencedColumns: ["symbol"]
          },
        ]
      }
      market_instruments: {
        Row: {
          asset_class: string
          created_at: string
          display_name: string
          is_enabled: boolean
          symbol: string
        }
        Insert: {
          asset_class: string
          created_at?: string
          display_name: string
          is_enabled?: boolean
          symbol: string
        }
        Update: {
          asset_class?: string
          created_at?: string
          display_name?: string
          is_enabled?: boolean
          symbol?: string
        }
        Relationships: []
      }
      market_news: {
        Row: {
          country: string | null
          currency: string | null
          event_at: string | null
          id: string
          impact: string | null
          instrument_symbols: string[]
          provider: string
          provider_event_id: string | null
          published_at: string | null
          raw_data: Json
          received_at: string
          summary: string | null
          title: string
          url: string | null
        }
        Insert: {
          country?: string | null
          currency?: string | null
          event_at?: string | null
          id?: string
          impact?: string | null
          instrument_symbols?: string[]
          provider: string
          provider_event_id?: string | null
          published_at?: string | null
          raw_data?: Json
          received_at?: string
          summary?: string | null
          title: string
          url?: string | null
        }
        Update: {
          country?: string | null
          currency?: string | null
          event_at?: string | null
          id?: string
          impact?: string | null
          instrument_symbols?: string[]
          provider?: string
          provider_event_id?: string | null
          published_at?: string | null
          raw_data?: Json
          received_at?: string
          summary?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      market_predictions: {
        Row: {
          created_at: string
          evaluated_at: string | null
          evaluation_data: Json
          evaluation_due_at: string | null
          id: string
          instrument_symbol: string
          outcome: string | null
          predicted_direction: string
          report_id: string
          timeframe: string
        }
        Insert: {
          created_at?: string
          evaluated_at?: string | null
          evaluation_data?: Json
          evaluation_due_at?: string | null
          id?: string
          instrument_symbol: string
          outcome?: string | null
          predicted_direction: string
          report_id: string
          timeframe: string
        }
        Update: {
          created_at?: string
          evaluated_at?: string | null
          evaluation_data?: Json
          evaluation_due_at?: string | null
          id?: string
          instrument_symbol?: string
          outcome?: string | null
          predicted_direction?: string
          report_id?: string
          timeframe?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_predictions_instrument_symbol_fkey"
            columns: ["instrument_symbol"]
            isOneToOne: false
            referencedRelation: "market_instruments"
            referencedColumns: ["symbol"]
          },
          {
            foreignKeyName: "market_predictions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "market_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      market_quotes: {
        Row: {
          ask: number | null
          bid: number | null
          id: number
          instrument_symbol: string
          last: number | null
          metadata: Json
          observed_at: string
          provider_symbol: string
          received_at: string
          source: string
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          id?: never
          instrument_symbol: string
          last?: number | null
          metadata?: Json
          observed_at: string
          provider_symbol: string
          received_at?: string
          source: string
        }
        Update: {
          ask?: number | null
          bid?: number | null
          id?: never
          instrument_symbol?: string
          last?: number | null
          metadata?: Json
          observed_at?: string
          provider_symbol?: string
          received_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_quotes_instrument_symbol_fkey"
            columns: ["instrument_symbol"]
            isOneToOne: false
            referencedRelation: "market_instruments"
            referencedColumns: ["symbol"]
          },
        ]
      }
      market_report_preferences: {
        Row: {
          preferred_timeframes: string[]
          report_scope: string
          timezone: string
          updated_at: string
          user_id: string
          watchlist: string[]
        }
        Insert: {
          preferred_timeframes?: string[]
          report_scope?: string
          timezone?: string
          updated_at?: string
          user_id: string
          watchlist?: string[]
        }
        Update: {
          preferred_timeframes?: string[]
          report_scope?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          watchlist?: string[]
        }
        Relationships: []
      }
      market_reports: {
        Row: {
          created_at: string
          data_as_of: string | null
          generated_at: string | null
          id: string
          instrument_symbol: string
          report_content: Json
          report_scope: string
          source_snapshot: Json
          status: string
          timeframe: string
          user_id: string | null
          verdict: string | null
        }
        Insert: {
          created_at?: string
          data_as_of?: string | null
          generated_at?: string | null
          id?: string
          instrument_symbol: string
          report_content?: Json
          report_scope: string
          source_snapshot?: Json
          status: string
          timeframe: string
          user_id?: string | null
          verdict?: string | null
        }
        Update: {
          created_at?: string
          data_as_of?: string | null
          generated_at?: string | null
          id?: string
          instrument_symbol?: string
          report_content?: Json
          report_scope?: string
          source_snapshot?: Json
          status?: string
          timeframe?: string
          user_id?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_reports_instrument_symbol_fkey"
            columns: ["instrument_symbol"]
            isOneToOne: false
            referencedRelation: "market_instruments"
            referencedColumns: ["symbol"]
          },
        ]
      }
      market_strategy_results: {
        Row: {
          calculated_at: string
          direction: string
          id: string
          inputs: Json
          metrics: Json
          report_id: string
          result_status: string
          strategy_key: string
        }
        Insert: {
          calculated_at?: string
          direction: string
          id?: string
          inputs?: Json
          metrics?: Json
          report_id: string
          result_status: string
          strategy_key: string
        }
        Update: {
          calculated_at?: string
          direction?: string
          id?: string
          inputs?: Json
          metrics?: Json
          report_id?: string
          result_status?: string
          strategy_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_strategy_results_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "market_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_direct_connections: {
        Row: {
          access_mode: string
          account_currency: string | null
          account_login: string
          account_name: string | null
          balance: number | null
          bridge_instance_id: string | null
          broker_name: string | null
          broker_server: string
          connection_status: string
          created_at: string
          equity: number | null
          free_margin: number | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          leverage: string | null
          margin: number | null
          margin_level: number | null
          open_positions: Json
          pending_orders: Json
          platform: string
          recent_history: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          access_mode?: string
          account_currency?: string | null
          account_login: string
          account_name?: string | null
          balance?: number | null
          bridge_instance_id?: string | null
          broker_name?: string | null
          broker_server: string
          connection_status?: string
          created_at?: string
          equity?: number | null
          free_margin?: number | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          leverage?: string | null
          margin?: number | null
          margin_level?: number | null
          open_positions?: Json
          pending_orders?: Json
          platform?: string
          recent_history?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          access_mode?: string
          account_currency?: string | null
          account_login?: string
          account_name?: string | null
          balance?: number | null
          bridge_instance_id?: string | null
          broker_name?: string | null
          broker_server?: string
          connection_status?: string
          created_at?: string
          equity?: number | null
          free_margin?: number | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          leverage?: string | null
          margin?: number | null
          margin_level?: number | null
          open_positions?: Json
          pending_orders?: Json
          platform?: string
          recent_history?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      robot_commands: {
        Row: {
          command: string
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          command: string
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          command?: string
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      robot_settings: {
        Row: {
          alerts_enabled: boolean
          break_even_enabled: boolean
          break_even_trigger: number
          is_running: boolean
          lot_size: number
          max_trades: number
          pairs: string[]
          risk_percent: number
          scalper_frequency: string
          strategy: string
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean
          break_even_enabled?: boolean
          break_even_trigger?: number
          is_running?: boolean
          lot_size?: number
          max_trades?: number
          pairs?: string[]
          risk_percent?: number
          scalper_frequency?: string
          strategy?: string
          timeframe?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean
          is_running?: boolean
          lot_size?: number
          max_trades?: number
          pairs?: string[]
          risk_percent?: number
          scalper_frequency?: string
          strategy?: string
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_accounts: {
        Row: {
          account_currency: string | null
          balance: number | null
          broker_server: string
          connection_key: string
          created_at: string
          ea_state: string | null
          ea_state_at: string | null
          ea_version: string | null
          equity: number | null
          id: string
          last_heartbeat: string | null
          login: string
          open_trades: Json | null
          pending_orders: Json | null
          platform: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_currency?: string | null
          balance?: number | null
          broker_server?: string
          connection_key?: string
          created_at?: string
          ea_state?: string | null
          ea_state_at?: string | null
          ea_version?: string | null
          equity?: number | null
          id?: string
          last_heartbeat?: string | null
          login?: string
          open_trades?: Json | null
          pending_orders?: Json | null
          platform?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          broker_server?: string
          connection_key?: string
          created_at?: string
          ea_state?: string | null
          ea_state_at?: string | null
          ea_version?: string | null
          equity?: number | null
          id?: string
          last_heartbeat?: string | null
          login?: string
          open_trades?: Json | null
          pending_orders?: Json | null
          platform?: string
          status?: string
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
      rotate_trading_account_key: { Args: never; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
