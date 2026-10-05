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
      automations: {
        Row: {
          action: string
          created_at: string
          device_id: string | null
          enabled: boolean
          id: string
          last_triggered_at: string | null
          name: string
          operator: string
          project_id: string
          sensor_id: string | null
          threshold: number | null
        }
        Insert: {
          action?: string
          created_at?: string
          device_id?: string | null
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          name: string
          operator?: string
          project_id: string
          sensor_id?: string | null
          threshold?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          device_id?: string | null
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          name?: string
          operator?: string
          project_id?: string
          sensor_id?: string | null
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_images: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          note: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          note?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          note?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      device_commands: {
        Row: {
          command: string
          confirmed_at: string | null
          created_at: string
          device_id: string | null
          device_name: string
          gateway_id: string | null
          id: string
          project_id: string
          reason: string | null
          source: string | null
          status: string
          user_email: string | null
        }
        Insert: {
          command: string
          confirmed_at?: string | null
          created_at?: string
          device_id?: string | null
          device_name: string
          gateway_id?: string | null
          id?: string
          project_id: string
          reason?: string | null
          source?: string | null
          status?: string
          user_email?: string | null
        }
        Update: {
          command?: string
          confirmed_at?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string
          gateway_id?: string | null
          id?: string
          project_id?: string
          reason?: string | null
          source?: string | null
          status?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_commands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          arduino_pin: string | null
          command_off: string | null
          command_on: string | null
          control_type: string
          created_at: string
          device_key: string
          device_type: string
          enabled: boolean
          feedback_field: string | null
          icon: string | null
          id: string
          last_confirmed_at: string | null
          name: string
          project_id: string
          room: string | null
          sort_order: number
          state: string
          status: string
          value: number | null
        }
        Insert: {
          arduino_pin?: string | null
          command_off?: string | null
          command_on?: string | null
          control_type?: string
          created_at?: string
          device_key: string
          device_type?: string
          enabled?: boolean
          feedback_field?: string | null
          icon?: string | null
          id?: string
          last_confirmed_at?: string | null
          name: string
          project_id: string
          room?: string | null
          sort_order?: number
          state?: string
          status?: string
          value?: number | null
        }
        Update: {
          arduino_pin?: string | null
          command_off?: string | null
          command_on?: string | null
          control_type?: string
          created_at?: string
          device_key?: string
          device_type?: string
          enabled?: boolean
          feedback_field?: string | null
          icon?: string | null
          id?: string
          last_confirmed_at?: string | null
          name?: string
          project_id?: string
          room?: string | null
          sort_order?: number
          state?: string
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          acknowledged: boolean
          created_at: string
          detail: string | null
          id: string
          kind: string
          project_id: string
          sensor_id: string | null
          severity: string
          title: string
          value: number | null
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          project_id: string
          sensor_id?: string | null
          severity?: string
          title: string
          value?: number | null
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          project_id?: string
          sensor_id?: string | null
          severity?: string
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_credentials: {
        Row: {
          kind: string
          project_id: string
          updated_at: string
          value: string
        }
        Insert: {
          kind: string
          project_id: string
          updated_at?: string
          value: string
        }
        Update: {
          kind?: string
          project_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          camera_enabled: boolean
          camera_endpoint: string | null
          camera_name: string | null
          camera_upload_endpoint: string | null
          created_at: string
          demo_mode: boolean
          description: string | null
          gateway_checked_at: string | null
          gateway_endpoint: string | null
          gateway_id: string | null
          gateway_local_ip: string | null
          gateway_name: string | null
          gateway_status: string
          gateway_url: string | null
          id: string
          location: string | null
          name: string
          offline_timeout_sec: number
          remote_enabled: boolean
          setup_complete: boolean
          setup_step: number
          telegram_chat_id: string | null
          telegram_enabled: boolean
          thingspeak_channel_id: string | null
          thingspeak_enabled: boolean
          thingspeak_interval_sec: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_enabled?: boolean
          camera_endpoint?: string | null
          camera_name?: string | null
          camera_upload_endpoint?: string | null
          created_at?: string
          demo_mode?: boolean
          description?: string | null
          gateway_checked_at?: string | null
          gateway_endpoint?: string | null
          gateway_id?: string | null
          gateway_local_ip?: string | null
          gateway_name?: string | null
          gateway_status?: string
          gateway_url?: string | null
          id?: string
          location?: string | null
          name: string
          offline_timeout_sec?: number
          remote_enabled?: boolean
          setup_complete?: boolean
          setup_step?: number
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          thingspeak_channel_id?: string | null
          thingspeak_enabled?: boolean
          thingspeak_interval_sec?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_enabled?: boolean
          camera_endpoint?: string | null
          camera_name?: string | null
          camera_upload_endpoint?: string | null
          created_at?: string
          demo_mode?: boolean
          description?: string | null
          gateway_checked_at?: string | null
          gateway_endpoint?: string | null
          gateway_id?: string | null
          gateway_local_ip?: string | null
          gateway_name?: string | null
          gateway_status?: string
          gateway_url?: string | null
          id?: string
          location?: string | null
          name?: string
          offline_timeout_sec?: number
          remote_enabled?: boolean
          setup_complete?: boolean
          setup_step?: number
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          thingspeak_channel_id?: string | null
          thingspeak_enabled?: boolean
          thingspeak_interval_sec?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sensors: {
        Row: {
          alerts_enabled: boolean
          arduino_pin: string | null
          created_at: string
          critical_threshold: number | null
          data_field: string | null
          decimals: number
          enabled: boolean
          id: string
          include_in_analytics: boolean
          max_value: number | null
          min_value: number | null
          name: string
          project_id: string
          sensor_key: string
          sensor_type: string
          show_on_monitoring: boolean
          sort_order: number
          thingspeak_field: number | null
          unit: string | null
          value_kind: string
          warning_threshold: number | null
        }
        Insert: {
          alerts_enabled?: boolean
          arduino_pin?: string | null
          created_at?: string
          critical_threshold?: number | null
          data_field?: string | null
          decimals?: number
          enabled?: boolean
          id?: string
          include_in_analytics?: boolean
          max_value?: number | null
          min_value?: number | null
          name: string
          project_id: string
          sensor_key: string
          sensor_type?: string
          show_on_monitoring?: boolean
          sort_order?: number
          thingspeak_field?: number | null
          unit?: string | null
          value_kind?: string
          warning_threshold?: number | null
        }
        Update: {
          alerts_enabled?: boolean
          arduino_pin?: string | null
          created_at?: string
          critical_threshold?: number | null
          data_field?: string | null
          decimals?: number
          enabled?: boolean
          id?: string
          include_in_analytics?: boolean
          max_value?: number | null
          min_value?: number | null
          name?: string
          project_id?: string
          sensor_key?: string
          sensor_type?: string
          show_on_monitoring?: boolean
          sort_order?: number
          thingspeak_field?: number | null
          unit?: string | null
          value_kind?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_project: { Args: { _project: string }; Returns: boolean }
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
