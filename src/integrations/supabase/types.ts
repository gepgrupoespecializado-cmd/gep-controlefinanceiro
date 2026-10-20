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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_data: {
        Row: {
          organization_id: string
          payload: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          organization_id: string
          payload?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          organization_id?: string
          payload?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          arquivado: boolean
          created_at: string
          customer_id: string | null
          customer_legacy_id: string | null
          data: string | null
          data_texto: string | null
          endereco: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          intervalo_dias: number | null
          legacy_id: string | null
          observacoes: string | null
          organization_id: string
          quote_id: string | null
          quote_legacy_id: string | null
          recorrencia: string | null
          report_id: string | null
          report_legacy_id: string | null
          responsavel: string | null
          service_id: string | null
          service_legacy_id: string | null
          status: string
          titulo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          arquivado?: boolean
          created_at?: string
          customer_id?: string | null
          customer_legacy_id?: string | null
          data?: string | null
          data_texto?: string | null
          endereco?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          intervalo_dias?: number | null
          legacy_id?: string | null
          observacoes?: string | null
          organization_id: string
          quote_id?: string | null
          quote_legacy_id?: string | null
          recorrencia?: string | null
          report_id?: string | null
          report_legacy_id?: string | null
          responsavel?: string | null
          service_id?: string | null
          service_legacy_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          arquivado?: boolean
          created_at?: string
          customer_id?: string | null
          customer_legacy_id?: string | null
          data?: string | null
          data_texto?: string | null
          endereco?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          intervalo_dias?: number | null
          legacy_id?: string | null
          observacoes?: string | null
          organization_id?: string
          quote_id?: string | null
          quote_legacy_id?: string | null
          recorrencia?: string | null
          report_id?: string | null
          report_legacy_id?: string | null
          responsavel?: string | null
          service_id?: string | null
          service_legacy_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_quote_id_fkey"
            columns: ["organization_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "appointments_report_fkey"
            columns: ["organization_id", "report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["organization_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          antes: string | null
          campo: string | null
          created_at: string
          data: string | null
          depois: string | null
          entidade: string
          entidade_id: string | null
          entidade_nome: string | null
          id: string
          legacy_id: string | null
          organization_id: string
          user_id: string | null
          usuario: string | null
        }
        Insert: {
          acao: string
          antes?: string | null
          campo?: string | null
          created_at?: string
          data?: string | null
          depois?: string | null
          entidade: string
          entidade_id?: string | null
          entidade_nome?: string | null
          id?: string
          legacy_id?: string | null
          organization_id: string
          user_id?: string | null
          usuario?: string | null
        }
        Update: {
          acao?: string
          antes?: string | null
          campo?: string | null
          created_at?: string
          data?: string | null
          depois?: string | null
          entidade?: string
          entidade_id?: string | null
          entidade_nome?: string | null
          id?: string
          legacy_id?: string | null
          organization_id?: string
          user_id?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          arquivado: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          criado_em: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          frequencia: string
          id: string
          legacy_id: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          organization_id: string
          rua: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          arquivado?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          criado_em?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frequencia?: string
          id?: string
          legacy_id?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          organization_id: string
          rua?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          arquivado?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          criado_em?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frequencia?: string
          id?: string
          legacy_id?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          organization_id?: string
          rua?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      description_templates: {
        Row: {
          conteudo: string
          created_at: string
          criado_em: string | null
          favorito: boolean
          id: string
          legacy_id: string | null
          nome: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          criado_em?: string | null
          favorito?: boolean
          id?: string
          legacy_id?: string | null
          nome?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_em?: string | null
          favorito?: boolean
          id?: string
          legacy_id?: string | null
          nome?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "description_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          arquivado: boolean
          categoria: string | null
          created_at: string
          data: string | null
          descricao: string
          id: string
          legacy_id: string | null
          organization_id: string
          origem_legacy_id: string | null
          origem_tipo: string | null
          origin_appointment_id: string | null
          origin_quote_id: string | null
          pago: boolean | null
          tipo: string
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          arquivado?: boolean
          categoria?: string | null
          created_at?: string
          data?: string | null
          descricao?: string
          id?: string
          legacy_id?: string | null
          organization_id: string
          origem_legacy_id?: string | null
          origem_tipo?: string | null
          origin_appointment_id?: string | null
          origin_quote_id?: string | null
          pago?: boolean | null
          tipo?: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          arquivado?: boolean
          categoria?: string | null
          created_at?: string
          data?: string | null
          descricao?: string
          id?: string
          legacy_id?: string | null
          organization_id?: string
          origem_legacy_id?: string | null
          origem_tipo?: string | null
          origin_appointment_id?: string | null
          origin_quote_id?: string | null
          pago?: boolean | null
          tipo?: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_origin_appointment_id_fkey"
            columns: ["organization_id", "origin_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "financial_transactions_origin_quote_id_fkey"
            columns: ["organization_id", "origin_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      organization_counters: {
        Row: {
          organization_id: string
          proximo: number
          tipo: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          proximo?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          organization_id?: string
          proximo?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          data_version: string
          empresa: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_version?: string
          empresa?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_version?: string
          empresa?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          name: string
          owner_id: string
          plan: string
          responsavel: string | null
          status: string
          telefone: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          name: string
          owner_id: string
          plan?: string
          responsavel?: string | null
          status?: string
          telefone?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          responsavel?: string | null
          status?: string
          telefone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_seen_at: string | null
          nome: string | null
          organization_id: string | null
          role: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string | null
          nome?: string | null
          organization_id?: string | null
          role?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string | null
          nome?: string | null
          organization_id?: string | null
          role?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string
          escopo: string | null
          id: string
          organization_id: string
          posicao: number
          quantidade: number
          quote_id: string
          service_id: string | null
          service_legacy_id: string | null
          unidade: string | null
          updated_at: string
          valor_unit: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string
          escopo?: string | null
          id?: string
          organization_id: string
          posicao?: number
          quantidade?: number
          quote_id: string
          service_id?: string | null
          service_legacy_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_unit?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string
          escopo?: string | null
          id?: string
          organization_id?: string
          posicao?: number
          quantidade?: number
          quote_id?: string
          service_id?: string | null
          service_legacy_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["organization_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "quote_items_service_id_fkey"
            columns: ["organization_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      quotes: {
        Row: {
          arquivado: boolean
          condicoes: Json
          created_at: string
          criado_em: string | null
          customer_id: string | null
          customer_legacy_id: string | null
          data_prevista: string | null
          desconto: number | null
          descricao_servicos: string
          diferencial: string | null
          escopo: Json
          formas_pagamento: Json
          fotos_antes: Json
          fotos_depois: Json
          hora_prevista: string | null
          id: string
          legacy_id: string | null
          nao_incluso: Json
          numero: number
          observacoes: string | null
          organization_id: string
          prazo: string | null
          status: string
          updated_at: string
          validade_dias: number
          versao: number | null
        }
        Insert: {
          arquivado?: boolean
          condicoes?: Json
          created_at?: string
          criado_em?: string | null
          customer_id?: string | null
          customer_legacy_id?: string | null
          data_prevista?: string | null
          desconto?: number | null
          descricao_servicos?: string
          diferencial?: string | null
          escopo?: Json
          formas_pagamento?: Json
          fotos_antes?: Json
          fotos_depois?: Json
          hora_prevista?: string | null
          id?: string
          legacy_id?: string | null
          nao_incluso?: Json
          numero?: number
          observacoes?: string | null
          organization_id: string
          prazo?: string | null
          status?: string
          updated_at?: string
          validade_dias?: number
          versao?: number | null
        }
        Update: {
          arquivado?: boolean
          condicoes?: Json
          created_at?: string
          criado_em?: string | null
          customer_id?: string | null
          customer_legacy_id?: string | null
          data_prevista?: string | null
          desconto?: number | null
          descricao_servicos?: string
          diferencial?: string | null
          escopo?: Json
          formas_pagamento?: Json
          fotos_antes?: Json
          fotos_depois?: Json
          hora_prevista?: string | null
          id?: string
          legacy_id?: string | null
          nao_incluso?: Json
          numero?: number
          observacoes?: string | null
          organization_id?: string
          prazo?: string | null
          status?: string
          updated_at?: string
          validade_dias?: number
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          organization_id: string
          posicao: number
          report_id: string
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          organization_id: string
          posicao?: number
          report_id: string
          tipo: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          organization_id?: string
          posicao?: number
          report_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["organization_id", "report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      service_reports: {
        Row: {
          appointment_id: string | null
          appointment_legacy_id: string | null
          arquivado: boolean
          assinatura_cliente: string | null
          assinatura_tecnico: string | null
          created_at: string
          criado_em: string | null
          customer_id: string | null
          customer_legacy_id: string | null
          data_execucao: string | null
          data_pagamento: string | null
          descricao: string
          formas_pagamento_recebimento: Json
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          legacy_id: string | null
          numero: number
          observacoes: string | null
          observacoes_financeiras: string | null
          organization_id: string
          parcelas: number | null
          quote_id: string | null
          quote_legacy_id: string | null
          recebido_por: string | null
          responsavel: string | null
          servico_executado: string
          situacao_pagamento: string | null
          status: string
          taxa_cartao: number | null
          updated_at: string
          valor: number | null
          valor_orcamento: number | null
          valor_recebido: number | null
        }
        Insert: {
          appointment_id?: string | null
          appointment_legacy_id?: string | null
          arquivado?: boolean
          assinatura_cliente?: string | null
          assinatura_tecnico?: string | null
          created_at?: string
          criado_em?: string | null
          customer_id?: string | null
          customer_legacy_id?: string | null
          data_execucao?: string | null
          data_pagamento?: string | null
          descricao?: string
          formas_pagamento_recebimento?: Json
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          legacy_id?: string | null
          numero?: number
          observacoes?: string | null
          observacoes_financeiras?: string | null
          organization_id: string
          parcelas?: number | null
          quote_id?: string | null
          quote_legacy_id?: string | null
          recebido_por?: string | null
          responsavel?: string | null
          servico_executado?: string
          situacao_pagamento?: string | null
          status?: string
          taxa_cartao?: number | null
          updated_at?: string
          valor?: number | null
          valor_orcamento?: number | null
          valor_recebido?: number | null
        }
        Update: {
          appointment_id?: string | null
          appointment_legacy_id?: string | null
          arquivado?: boolean
          assinatura_cliente?: string | null
          assinatura_tecnico?: string | null
          created_at?: string
          criado_em?: string | null
          customer_id?: string | null
          customer_legacy_id?: string | null
          data_execucao?: string | null
          data_pagamento?: string | null
          descricao?: string
          formas_pagamento_recebimento?: Json
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          legacy_id?: string | null
          numero?: number
          observacoes?: string | null
          observacoes_financeiras?: string | null
          organization_id?: string
          parcelas?: number | null
          quote_id?: string | null
          quote_legacy_id?: string | null
          recebido_por?: string | null
          responsavel?: string | null
          servico_executado?: string
          situacao_pagamento?: string | null
          status?: string
          taxa_cartao?: number | null
          updated_at?: string
          valor?: number | null
          valor_orcamento?: number | null
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reports_appointment_id_fkey"
            columns: ["organization_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_reports_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reports_quote_id_fkey"
            columns: ["organization_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      services: {
        Row: {
          arquivado: boolean
          created_at: string
          descricao: string | null
          id: string
          legacy_id: string | null
          nome: string
          organization_id: string
          tempo_estimado: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          arquivado?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          legacy_id?: string | null
          nome?: string
          organization_id: string
          tempo_estimado?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          arquivado?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          legacy_id?: string | null
          nome?: string
          organization_id?: string
          tempo_estimado?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      acessos: {
        Row: {
          created_at: string
          email: string | null
          liberado_em: string | null
          observacao: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          liberado_em?: string | null
          observacao?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          liberado_em?: string | null
          observacao?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_access_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          email_snapshot: string | null
          id: string
          new_status: string | null
          observacao: string | null
          previous_status: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          email_snapshot?: string | null
          id?: string
          new_status?: string | null
          observacao?: string | null
          previous_status?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          email_snapshot?: string | null
          id?: string
          new_status?: string | null
          observacao?: string | null
          previous_status?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      emails_pre_liberados: {
        Row: {
          criado_em: string
          email: string
        }
        Insert: {
          criado_em?: string
          email: string
        }
        Update: {
          criado_em?: string
          email?: string
        }
        Relationships: []
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
      admin_preliberar_email: {
        Args: { _email: string; _observacao?: string | null }
        Returns: string
      }
      admin_remover_email_pre_liberado: {
        Args: { _email: string }
        Returns: boolean
      }
      admin_set_access_status: {
        Args: { _observacao?: string | null; _status: string; _target_user_id: string }
        Returns: boolean
      }
      configure_app_owner: {
        Args: { _owner_user_id: string }
        Returns: undefined
      }
      get_my_access_state: {
        Args: never
        Returns: { is_admin: boolean; status: string }[]
      }
      is_acesso_ativo: {
        Args: { _user_id: string }
        Returns: boolean
      }
      current_org_id: { Args: never; Returns: string }
      has_org_role: {
        Args: { _org: string; _role: Database["public"]["Enums"]["org_role"] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_manager: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      next_number: { Args: { _tipo: string }; Returns: number }
      profile_self_allowed: {
        Args: { _org: string; _role: string }
        Returns: boolean
      }
      seed_counter: {
        Args: { _proximo: number; _tipo: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      org_role: "owner" | "admin" | "member"
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
    Enums: {
      app_role: ["super_admin", "admin", "user"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
