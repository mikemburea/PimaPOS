// src/hooks/useRealtimeTransactions.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Define the transaction type to match your database structure
interface Transaction {
  id: string;
  supplier_id?: string | null;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  created_at: string;
  transaction_number?: string | null;
  is_walkin: boolean;
  walkin_name?: string | null;
  walkin_phone?: string | null;
  material_category?: string | null;
  weight_kg?: number | null;
  unit_price?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  quality_grade?: string | null;
  deductions?: number | null;
  final_amount?: number | null;
  receipt_number?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
}

interface UseRealtimeTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  searchTransactions: (query: string) => Promise<void>;
  filterByStatus: (status: string) => Promise<void>;
  filterByDateRange: (startDate: string, endDate: string) => Promise<void>;
  filterByMaterial: (material: string) => Promise<void>;
  getTodaysTransactions: () => Transaction[];
  getWeeklyTransactions: () => Transaction[];
  getMonthlyTransactions: () => Transaction[];
}

export const useRealtimeTransactions = (): UseRealtimeTransactionsReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Search transactions by various fields
  const searchTransactions = async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!query.trim()) {
        await fetchTransactions();
        return;
      }

      const { data, error: searchError } = await supabase
        .from('transactions')
        .select('*')
        .or(`transaction_number.ilike.%${query}%,walkin_name.ilike.%${query}%,material_type.ilike.%${query}%,notes.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (searchError) {
        throw searchError;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Error searching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to search transactions');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions by payment status
  const filterByStatus = async (status: string) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('transactions').select('*');

      if (status !== 'all') {
        query = query.eq('payment_status', status);
      }

      const { data, error: filterError } = await query
        .order('created_at', { ascending: false });

      if (filterError) {
        throw filterError;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Error filtering transactions by status:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter transactions');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions by date range
  const filterByDateRange = async (startDate: string, endDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: filterError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('created_at', { ascending: false });

      if (filterError) {
        throw filterError;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Error filtering transactions by date range:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter transactions');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions by material type
  const filterByMaterial = async (material: string) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('transactions').select('*');

      if (material !== 'all') {
        query = query.eq('material_type', material);
      }

      const { data, error: filterError } = await query
        .order('created_at', { ascending: false });

      if (filterError) {
        throw filterError;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Error filtering transactions by material:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter transactions');
    } finally {
      setLoading(false);
    }
  };

  // Get today's transactions
  const getTodaysTransactions = (): Transaction[] => {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter(transaction => {
      const transactionDate = transaction.transaction_date.split('T')[0];
      return transactionDate === today;
    });
  };

  // Get this week's transactions
  const getWeeklyTransactions = (): Transaction[] => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoString = oneWeekAgo.toISOString().split('T')[0];
    
    return transactions.filter(transaction => {
      const transactionDate = transaction.transaction_date.split('T')[0];
      return transactionDate >= weekAgoString;
    });
  };

  // Get this month's transactions
  const getMonthlyTransactions = (): Transaction[] => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthAgoString = oneMonthAgo.toISOString().split('T')[0];
    
    return transactions.filter(transaction => {
      const transactionDate = transaction.transaction_date.split('T')[0];
      return transactionDate >= monthAgoString;
    });
  };

  // Set up real-time subscription for transaction changes
  useEffect(() => {
    // Initial fetch
    fetchTransactions();

    // Set up real-time subscription
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('New transaction added:', payload.new);
          setTransactions(current => [payload.new as Transaction, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction updated:', payload.new);
          setTransactions(current =>
            current.map(transaction =>
              transaction.id === payload.new.id ? payload.new as Transaction : transaction
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction deleted:', payload.old);
          setTransactions(current =>
            current.filter(transaction => transaction.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up transactions subscription');
      channel.unsubscribe();
    };
  }, []);

  // Refetch function for manual refresh
  const refetch = async () => {
    await fetchTransactions();
  };

  return {
    transactions,
    loading,
    error,
    refetch,
    searchTransactions,
    filterByStatus,
    filterByDateRange,
    filterByMaterial,
    getTodaysTransactions,
    getWeeklyTransactions,
    getMonthlyTransactions
  };
};