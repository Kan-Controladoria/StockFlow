export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: number
          codigo_barras: string
          codigo_produto: string
          produto: string
          departamento: string
          categoria: string
          subcategoria: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          codigo_barras: string
          codigo_produto: string
          produto: string
          departamento: string
          categoria: string
          subcategoria: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          codigo_barras?: string
          codigo_produto?: string
          produto?: string
          departamento?: string
          categoria?: string
          subcategoria?: string
          created_at?: string
          updated_at?: string
        }
      }
      compartments: {
        Row: {
          id: number
          codigo_endereco: string
          corredor: number
          linha: string
          coluna: number
          created_at: string
        }
        Insert: {
          id?: number
          codigo_endereco: string
          corredor: number
          linha: string
          coluna: number
          created_at?: string
        }
        Update: {
          id?: number
          codigo_endereco?: string
          corredor?: number
          linha?: string
          coluna?: number
          created_at?: string
        }
      }
      stock_by_compartment: {
        Row: {
          id: number
          compartment_id: number
          product_id: number
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          compartment_id: number
          product_id: number
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          compartment_id?: number
          product_id?: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      movements: {
        Row: {
          id: number
          user_id: string
          product_id: number
          compartment_id: number
          tipo: 'ENTRADA' | 'SAIDA'
          qty: number
          timestamp: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          compartment_id: number
          tipo: 'ENTRADA' | 'SAIDA'
          qty: number
          timestamp?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          compartment_id?: number
          tipo?: 'ENTRADA' | 'SAIDA'
          qty?: number
          timestamp?: string
        }
      }
    }
  }
}

export type Product = Database['public']['Tables']['products']['Row']
export type Compartment = Database['public']['Tables']['compartments']['Row']
export type StockByCompartment = Database['public']['Tables']['stock_by_compartment']['Row']
export type Movement = Database['public']['Tables']['movements']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export type ProductWithStock = Product & {
  stock?: StockByCompartment[]
}

export type CompartmentWithStock = Compartment & {
  stock: (StockByCompartment & {
    products: Product
  })[]
}
