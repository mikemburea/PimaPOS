// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Optional: Add error handling
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Database schema types for better type safety
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          phone: string
          email: string
          address: string
          material_types: string[]
          total_transactions: number
          total_value: number
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email: string
          address: string
          material_types?: string[]
          total_transactions?: number
          total_value?: number
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string
          address?: string
          material_types?: string[]
          total_transactions?: number
          total_value?: number
          status?: 'active' | 'inactive'
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          supplier_id: string
          supplier_name: string
          material: string
          material_type: string
          type: string
          date: string
          timestamp?: string
          transaction_type: string
          amount: number
          quantity: number
          total_value: number
          total_weight?: number
          weight?: number
          status: 'completed' | 'pending' | 'processing' | 'cancelled'
          description?: string
          created_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          supplier_name: string
          material: string
          material_type: string
          type: string
          date: string
          timestamp?: string
          transaction_type: string
          amount: number
          quantity: number
          total_value: number
          total_weight?: number
          weight?: number
          status?: 'completed' | 'pending' | 'processing' | 'cancelled'
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          supplier_name?: string
          material?: string
          material_type?: string
          type?: string
          date?: string
          timestamp?: string
          transaction_type?: string
          amount?: number
          quantity?: number
          total_value?: number
          total_weight?: number
          weight?: number
          status?: 'completed' | 'pending' | 'processing' | 'cancelled'
          description?: string
        }
      }
      materials: {
        Row: {
          id: string
          name: string
          description?: string
          icon?: string
          status?: string
          current_price?: number
          unit?: string
          avg_purchase_price?: number
          trend?: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          icon?: string
          status?: string
          current_price?: number
          unit?: string
          avg_purchase_price?: number
          trend?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          status?: string
          current_price?: number
          unit?: string
          avg_purchase_price?: number
          trend?: string
        }
      }
    }
  }
}

// Helper functions for common database operations
export const dbHelpers = {
  // Profile operations
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  async updateProfile(userId: string, updates: Database['public']['Tables']['profiles']['Update']) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Supplier operations
  async getSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createSupplier(supplier: Database['public']['Tables']['suppliers']['Insert']) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSupplier(id: string, updates: Database['public']['Tables']['suppliers']['Update']) {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteSupplier(id: string) {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Transaction operations
  async getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createTransaction(transaction: Database['public']['Tables']['transactions']['Insert']) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTransaction(id: string, updates: Database['public']['Tables']['transactions']['Update']) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Material operations
  async getMaterials() {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createMaterial(material: Database['public']['Tables']['materials']['Insert']) {
    const { data, error } = await supabase
      .from('materials')
      .insert(material)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMaterial(id: string, updates: Database['public']['Tables']['materials']['Update']) {
    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteMaterial(id: string) {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};