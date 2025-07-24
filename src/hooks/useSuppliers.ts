// src/hooks/useSuppliers.ts - Updated for real database integration
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Define types for supplier data
interface Supplier {
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
  contact_person?: string | null;
  website?: string | null;
  notes?: string | null;
  supplier_tier?: string | null;
  credit_limit?: number | null;
  preferred_payment_method?: string | null;
  total_weight?: number | null;
  first_transaction_date?: string | null;
  last_transaction_date?: string | null;
  average_transaction_value?: number | null;
  registration_reason?: string | null;
  registered_date?: string | null;
  registered_by?: string | null;
}

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  material_types: string[];
  status: 'active' | 'inactive';
  contact_person?: string;
  website?: string;
  notes?: string;
  supplier_tier?: string;
  credit_limit?: number;
  preferred_payment_method?: string;
  registration_reason?: string;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all suppliers from the database
  const fetchSuppliers = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Search suppliers by name, email, or contact person
  const searchSuppliers = async (query: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!query.trim()) {
        await fetchSuppliers();
        return;
      }

      const { data, error: searchError } = await supabase
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,contact_person.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (searchError) {
        throw new Error(searchError.message);
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error searching suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to search suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Filter suppliers by tier
  const filterByTier = async (tier: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('suppliers')
        .select('*');

      if (tier !== 'all') {
        query = query.eq('supplier_tier', tier);
      }

      const { data, error: filterError } = await query
        .order('created_at', { ascending: false });

      if (filterError) {
        throw new Error(filterError.message);
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error filtering suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Add new supplier to the database
  const addSupplier = async (supplierData: SupplierFormData): Promise<Supplier> => {
    try {
      const { data, error: insertError } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          email: supplierData.email,
          phone: supplierData.phone,
          address: supplierData.address,
          material_types: supplierData.material_types,
          status: supplierData.status || 'active',
          contact_person: supplierData.contact_person || null,
          website: supplierData.website || null,
          notes: supplierData.notes || null,
          supplier_tier: supplierData.supplier_tier || 'occasional',
          credit_limit: supplierData.credit_limit || 0,
          preferred_payment_method: supplierData.preferred_payment_method || 'cash',
          registration_reason: supplierData.registration_reason || null,
          total_transactions: 0,
          total_value: 0,
          total_weight: 0,
          registered_date: new Date().toISOString(),
          registered_by: 'admin' // You can get this from auth context
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Add the new supplier to the local state
      setSuppliers(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding supplier:', err);
      throw err;
    }
  };

  // Update supplier in the database
  const updateSupplier = async (id: string, supplierData: Partial<SupplierFormData>): Promise<Supplier> => {
    try {
      const { data, error: updateError } = await supabase
        .from('suppliers')
        .update({
          ...supplierData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update the supplier in local state
      setSuppliers(prev => prev.map(supplier => 
        supplier.id === id ? data : supplier
      ));

      return data;
    } catch (err) {
      console.error('Error updating supplier:', err);
      throw err;
    }
  };

  // Delete supplier from the database
  const deleteSupplier = async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Remove the supplier from local state
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      throw err;
    }
  };

  // Get supplier by ID
  const getSupplierById = async (id: string): Promise<Supplier | null> => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      console.error('Error fetching supplier:', err);
      return null;
    }
  };

  // Set up real-time subscription for supplier changes
  useEffect(() => {
    const channel = supabase
      .channel('suppliers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('New supplier added:', payload.new);
          setSuppliers(current => [payload.new as Supplier, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('Supplier updated:', payload.new);
          setSuppliers(current =>
            current.map(supplier =>
              supplier.id === payload.new.id ? payload.new as Supplier : supplier
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('Supplier deleted:', payload.old);
          setSuppliers(current =>
            current.filter(supplier => supplier.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Load suppliers on hook initialization
  useEffect(() => {
    fetchSuppliers();
  }, []);

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    searchSuppliers,
    filterByTier,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById
  };
};