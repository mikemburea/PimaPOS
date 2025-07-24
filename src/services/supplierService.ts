// src/services/supplierService.ts - Fixed version
import { supabase } from '../lib/supabase';
// Remove the Database import if you don't have it defined
// import type { Database } from '../lib/supabase';

// Define types based on your actual database structure
type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  material_types: string[];
  total_transactions: number;
  total_value: number;
  status: string;
  created_at: string;
  updated_at: string;
  contact_person?: string;
  website?: string;
  notes?: string;
  supplier_tier?: string;
  credit_limit?: number;
  preferred_payment_method?: string;
  total_weight?: number;
  first_transaction_date?: string;
  last_transaction_date?: string;
  average_transaction_value?: number;
  registration_reason?: string;
  registered_date?: string;
  registered_by?: string;
};

type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;
type SupplierUpdate = Partial<SupplierInsert>;

export class SupplierService {
  // Get all suppliers
  static async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }

    return data || [];
  }

  // Get supplier by ID
  static async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }

    return data;
  }

  // Create new supplier
  static async createSupplier(supplier: SupplierInsert): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }

    return data;
  }

  // Update supplier
  static async updateSupplier(id: string, updates: SupplierUpdate): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }

    return data;
  }

  // Delete supplier
  static async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  // Search suppliers
  static async searchSuppliers(searchTerm: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      .order('name');

    if (error) {
      console.error('Error searching suppliers:', error);
      throw error;
    }

    return data || [];
  }

  // Get suppliers by status
  static async getSuppliersByStatus(status: 'active' | 'inactive'): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('status', status)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers by status:', error);
      throw error;
    }

    return data || [];
  }

  // Get suppliers by tier (based on total_value)
  static async getSuppliersByTier(tier: 1 | 2 | 3): Promise<Supplier[]> {
    let query = supabase.from('suppliers').select('*');

    switch (tier) {
      case 1:
        query = query.gt('total_value', 100000);
        break;
      case 2:
        query = query.gte('total_value', 50000).lte('total_value', 100000);
        break;
      case 3:
        query = query.lt('total_value', 50000);
        break;
    }

    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error fetching suppliers by tier:', error);
      throw error;
    }

    return data || [];
  }

  // Subscribe to real-time changes
  static subscribeToSuppliers(callback: (suppliers: Supplier[]) => void) {
    return supabase
      .channel('suppliers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'suppliers' },
        () => {
          // Refetch suppliers when changes occur
          this.getSuppliers().then(callback);
        }
      )
      .subscribe();
  }
}