import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      pedidos: {
        Row: {
          id: string
          proveedor: string
          fecha: string
          estado: "transito" | "completado"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proveedor: string
          fecha?: string
          estado?: "transito" | "completado"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proveedor?: string
          fecha?: string
          estado?: "transito" | "completado"
          created_at?: string
          updated_at?: string
        }
      }
      productos: {
        Row: {
          id: string
          pedido_id: string
          cantidad: number
          unidades: number
          nombre: string
          precio1: number
          precio2: number
          linea_original: string
          created_at: string
        }
        Insert: {
          id?: string
          pedido_id: string
          cantidad: number
          unidades: number
          nombre: string
          precio1: number
          precio2: number
          linea_original: string
          created_at?: string
        }
        Update: {
          id?: string
          pedido_id?: string
          cantidad?: number
          unidades?: number
          nombre?: string
          precio1?: number
          precio2?: number
          linea_original?: string
          created_at?: string
        }
      }
    }
  }
}
