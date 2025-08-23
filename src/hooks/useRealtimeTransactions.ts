// src/hooks/useRealtimeTransactions.ts - FIXED for consistent uppercase transaction types
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// FIXED: Unified transaction interface with UPPERCASE transaction types to match App.tsx
interface Transaction {
  id: string;
  transaction_type: 'Purchase' | 'Sale'; // FIXED: Uppercase to match other components
  supplier_id?: string | null;
  material_type: string; // Unified field
  transaction_date: string;
  total_amount: number;
  created_at: string;
  
  // Purchase-specific fields
  transaction_number?: string | null;
  is_walkin?: boolean;
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
  supplier_name?: string | null;
  
  // Sales-specific fields
  transaction_id?: string; // For sales transactions
  material_id?: number | null;
  material_name?: string; // For sales transactions
  price_per_kg?: number | null;
  is_special_price?: boolean;
  original_price?: number | null;
}

interface UseRealtimeTransactionsReturn {
  transactions: Transaction[];
  purchaseTransactions: Transaction[];
  salesTransactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  searchTransactions: (query: string) => Promise<void>;
  filterByStatus: (status: string) => Promise<void>;
  filterByDateRange: (startDate: string, endDate: string) => Promise<void>;
  filterByMaterial: (material: string) => Promise<void>;
  filterByType: (type: 'all' | 'Purchase' | 'Sale') => Promise<void>; // FIXED: Uppercase
  getTodaysTransactions: () => Transaction[];
  getWeeklyTransactions: () => Transaction[];
  getMonthlyTransactions: () => Transaction[];
  getTotalRevenue: () => number;
  getTotalWeight: () => number;
}

export const useRealtimeTransactions = (): UseRealtimeTransactionsReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FIXED: Convert purchase transaction to unified format with UPPERCASE transaction_type
  const convertPurchaseTransaction = (purchaseData: any): Transaction => {
    return {
      ...purchaseData,
      transaction_type: 'Purchase' as const, // FIXED: Uppercase
      material_type: purchaseData.material_type
    };
  };

  // FIXED: Convert sales transaction to unified format with UPPERCASE transaction_type
  const convertSalesTransaction = (salesData: any): Transaction => {
    return {
      ...salesData,
      transaction_type: 'Sale' as const, // FIXED: Uppercase
      material_type: salesData.material_name, // Map material_name to material_type for consistency
      material_name: salesData.material_name
    };
  };

  // Fetch transactions from both tables
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[useRealtimeTransactions] Fetching transactions from both tables...');
      
      // Fetch both purchase and sales transactions in parallel
      const [purchaseResult, salesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('sales_transactions')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (purchaseResult.error) {
        throw purchaseResult.error;
      }
      if (salesResult.error) {
        throw salesResult.error;
      }

      // Convert and combine transactions
      const purchaseTransactions = (purchaseResult.data || []).map(convertPurchaseTransaction);
      const salesTransactions = (salesResult.data || []).map(convertSalesTransaction);
      
      console.log(`[useRealtimeTransactions] Fetched ${purchaseTransactions.length} purchase and ${salesTransactions.length} sales transactions`);
      
      // Combine and sort by created_at
      const allTransactions = [...purchaseTransactions, ...salesTransactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Search transactions by various fields across both tables
  const searchTransactions = async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!query.trim()) {
        await fetchTransactions();
        return;
      }

      console.log(`[useRealtimeTransactions] Searching for: "${query}"`);

      // Search in both tables
      const [purchaseResult, salesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .or(`transaction_number.ilike.%${query}%,walkin_name.ilike.%${query}%,supplier_name.ilike.%${query}%,material_type.ilike.%${query}%,notes.ilike.%${query}%`)
          .order('created_at', { ascending: false }),
        supabase
          .from('sales_transactions')
          .select('*')
          .or(`transaction_id.ilike.%${query}%,supplier_name.ilike.%${query}%,material_name.ilike.%${query}%,notes.ilike.%${query}%`)
          .order('created_at', { ascending: false })
      ]);

      if (purchaseResult.error) {
        throw purchaseResult.error;
      }
      if (salesResult.error) {
        throw salesResult.error;
      }

      // Convert and combine results
      const purchaseTransactions = (purchaseResult.data || []).map(convertPurchaseTransaction);
      const salesTransactions = (salesResult.data || []).map(convertSalesTransaction);
      
      const allTransactions = [...purchaseTransactions, ...salesTransactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log(`[useRealtimeTransactions] Search found ${allTransactions.length} transactions`);
      setTransactions(allTransactions);
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

      console.log(`[useRealtimeTransactions] Filtering by status: ${status}`);

      const [purchaseResult, salesResult] = await Promise.all([
        status === 'all' 
          ? supabase.from('transactions').select('*').order('created_at', { ascending: false })
          : supabase.from('transactions').select('*').eq('payment_status', status).order('created_at', { ascending: false }),
        status === 'all'
          ? supabase.from('sales_transactions').select('*').order('created_at', { ascending: false })
          : supabase.from('sales_transactions').select('*').eq('payment_status', status).order('created_at', { ascending: false })
      ]);

      if (purchaseResult.error) {
        throw purchaseResult.error;
      }
      if (salesResult.error) {
        throw salesResult.error;
      }

      // Convert and combine results
      const purchaseTransactions = (purchaseResult.data || []).map(convertPurchaseTransaction);
      const salesTransactions = (salesResult.data || []).map(convertSalesTransaction);
      
      const allTransactions = [...purchaseTransactions, ...salesTransactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
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

      console.log(`[useRealtimeTransactions] Filtering by date range: ${startDate} to ${endDate}`);

      const [purchaseResult, salesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('created_at', { ascending: false }),
        supabase
          .from('sales_transactions')
          .select('*')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('created_at', { ascending: false })
      ]);

      if (purchaseResult.error) {
        throw purchaseResult.error;
      }
      if (salesResult.error) {
        throw salesResult.error;
      }

      // Convert and combine results
      const purchaseTransactions = (purchaseResult.data || []).map(convertPurchaseTransaction);
      const salesTransactions = (salesResult.data || []).map(convertSalesTransaction);
      
      const allTransactions = [...purchaseTransactions, ...salesTransactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
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

      console.log(`[useRealtimeTransactions] Filtering by material: ${material}`);

      const [purchaseResult, salesResult] = await Promise.all([
        material === 'all'
          ? supabase.from('transactions').select('*').order('created_at', { ascending: false })
          : supabase.from('transactions').select('*').eq('material_type', material).order('created_at', { ascending: false }),
        material === 'all'
          ? supabase.from('sales_transactions').select('*').order('created_at', { ascending: false })
          : supabase.from('sales_transactions').select('*').eq('material_name', material).order('created_at', { ascending: false })
      ]);

      if (purchaseResult.error) {
        throw purchaseResult.error;
      }
      if (salesResult.error) {
        throw salesResult.error;
      }

      // Convert and combine results
      const purchaseTransactions = (purchaseResult.data || []).map(convertPurchaseTransaction);
      const salesTransactions = (salesResult.data || []).map(convertSalesTransaction);
      
      const allTransactions = [...purchaseTransactions, ...salesTransactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error filtering transactions by material:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter transactions');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Filter transactions by type with UPPERCASE transaction types
  const filterByType = async (type: 'all' | 'Purchase' | 'Sale') => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[useRealtimeTransactions] Filtering by type: ${type}`);

      if (type === 'all') {
        await fetchTransactions();
        return;
      }

      if (type === 'Purchase') {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const purchaseTransactions = (data || []).map(convertPurchaseTransaction);
        setTransactions(purchaseTransactions);
      } else if (type === 'Sale') {
        const { data, error } = await supabase
          .from('sales_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const salesTransactions = (data || []).map(convertSalesTransaction);
        setTransactions(salesTransactions);
      }
    } catch (err) {
      console.error('Error filtering transactions by type:', err);
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

  // FIXED: Get purchase transactions only with UPPERCASE comparison
  const getPurchaseTransactions = (): Transaction[] => {
    return transactions.filter(tx => tx.transaction_type === 'Purchase');
  };

  // FIXED: Get sales transactions only with UPPERCASE comparison
  const getSalesTransactions = (): Transaction[] => {
    return transactions.filter(tx => tx.transaction_type === 'Sale');
  };

  // Calculate total revenue
  const getTotalRevenue = (): number => {
    return transactions.reduce((total, tx) => total + tx.total_amount, 0);
  };

  // Calculate total weight
  const getTotalWeight = (): number => {
    return transactions.reduce((total, tx) => total + (tx.weight_kg || 0), 0);
  };

  // FIXED: Set up real-time subscriptions with proper transaction type conversion
  useEffect(() => {
    // Initial fetch
    fetchTransactions();

    console.log('[useRealtimeTransactions] Setting up real-time subscriptions...');

    // Set up real-time subscription for purchase transactions
    const purchaseChannel = supabase
      .channel('purchase-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('New purchase transaction added:', payload.new);
          const newTransaction = convertPurchaseTransaction(payload.new);
          setTransactions(current => [newTransaction, ...current]);
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
          console.log('Purchase transaction updated:', payload.new);
          const updatedTransaction = convertPurchaseTransaction(payload.new);
          setTransactions(current =>
            current.map(transaction =>
              transaction.id === updatedTransaction.id ? updatedTransaction : transaction
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
          console.log('Purchase transaction deleted:', payload.old);
          setTransactions(current =>
            current.filter(transaction => transaction.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeTransactions] Purchase subscription status:', status);
      });

    // Set up real-time subscription for sales transactions
    const salesChannel = supabase
      .channel('sales-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_transactions'
        },
        (payload) => {
          console.log('New sales transaction added:', payload.new);
          const newTransaction = convertSalesTransaction(payload.new);
          setTransactions(current => [newTransaction, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales_transactions'
        },
        (payload) => {
          console.log('Sales transaction updated:', payload.new);
          const updatedTransaction = convertSalesTransaction(payload.new);
          setTransactions(current =>
            current.map(transaction =>
              transaction.id === updatedTransaction.id ? updatedTransaction : transaction
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sales_transactions'
        },
        (payload) => {
          console.log('Sales transaction deleted:', payload.old);
          setTransactions(current =>
            current.filter(transaction => transaction.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeTransactions] Sales subscription status:', status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('[useRealtimeTransactions] Cleaning up transaction subscriptions');
      purchaseChannel.unsubscribe();
      salesChannel.unsubscribe();
    };
  }, []);

  // Refetch function for manual refresh
  const refetch = async () => {
    await fetchTransactions();
  };

  return {
    transactions,
    purchaseTransactions: getPurchaseTransactions(),
    salesTransactions: getSalesTransactions(),
    loading,
    error,
    refetch,
    searchTransactions,
    filterByStatus,
    filterByDateRange,
    filterByMaterial,
    filterByType,
    getTodaysTransactions,
    getWeeklyTransactions,
    getMonthlyTransactions,
    getTotalRevenue,
    getTotalWeight
  };
};