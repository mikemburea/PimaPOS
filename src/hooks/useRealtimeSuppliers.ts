// src/hooks/useRealtimeSuppliers.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Define the supplier type to match your database structure
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

interface UseRealtimeSuppliersReturn {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  searchSuppliers: (query: string) => Promise<void>;
  filterByTier: (tier: string) => Promise<void>;
  filterByStatus: (status: string) => Promise<void>;
}

export const useRealtimeSuppliers = (): UseRealtimeSuppliersReturn => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch suppliers from Supabase
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
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
  const searchSuppliers = async (query: string) => {
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
        throw searchError;
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
  const filterByTier = async (tier: string) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('suppliers').select('*');

      if (tier !== 'all') {
        query = query.eq('supplier_tier', tier);
      }

      const { data, error: filterError } = await query
        .order('created_at', { ascending: false });

      if (filterError) {
        throw filterError;
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error filtering suppliers by tier:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Filter suppliers by status
  const filterByStatus = async (status: string) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('suppliers').select('*');

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error: filterError } = await query
        .order('created_at', { ascending: false });

      if (filterError) {
        throw filterError;
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error filtering suppliers by status:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription for supplier changes
  useEffect(() => {
    // Initial fetch
    fetchSuppliers();

    // Set up real-time subscription
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

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up suppliers subscription');
      channel.unsubscribe();
    };
  }, []);

  // Refetch function for manual refresh
  const refetch = async () => {
    await fetchSuppliers();
  };

  return {
    suppliers,
    loading,
    error,
    refetch,
    searchSuppliers,
    filterByTier,
    filterByStatus
  };
};