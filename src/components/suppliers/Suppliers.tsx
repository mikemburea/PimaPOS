// src/components/suppliers/Suppliers.tsx - Enhanced with Duplicate Validation
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, Eye, Edit2, MapPin, Phone, Mail, Filter, Loader2, X, Globe, Calendar, Award, AlertCircle, Activity, RefreshCw, Trash2, CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Define interfaces to match database structure
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

interface SuppliersProps {
  onSupplierUpdate?: (supplier: Supplier) => Promise<void>;
}

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  material_types: string[];
  status: 'active' | 'inactive';
  contact_person: string;
  website: string;
  notes: string;
  supplier_tier: string;
  credit_limit: number;
  preferred_payment_method: string;
  registration_reason: string;
}

// Enhanced useSuppliers hook with real-time data and better error handling
const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching suppliers from database...');
      
      const [suppliersResult, transactionsResult, salesTransactionsResult] = await Promise.allSettled([
        supabase
          .from('suppliers')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*'),
        supabase
          .from('sales_transactions')
          .select('*')
      ]);

      if (suppliersResult.status === 'rejected' || suppliersResult.value.error) {
        throw suppliersResult.status === 'rejected' 
          ? suppliersResult.reason 
          : suppliersResult.value.error;
      }

      const rawSuppliers = suppliersResult.value.data || [];
      const transactions = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error
        ? transactionsResult.value.data || []
        : [];
      const salesTransactions = salesTransactionsResult.status === 'fulfilled' && !salesTransactionsResult.value.error
        ? salesTransactionsResult.value.data || []
        : [];

      console.log(`Fetched ${rawSuppliers.length} suppliers, ${transactions.length} purchase transactions, ${salesTransactions.length} sales transactions`);

      const suppliersWithRealStats = rawSuppliers.map(supplier => {
        const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
        const supplierSalesTransactions = salesTransactions.filter(t => t.supplier_id === supplier.id);
        
        const purchaseTransactionCount = supplierTransactions.length;
        const salesTransactionCount = supplierSalesTransactions.length;
        const totalTransactions = purchaseTransactionCount + salesTransactionCount;
        
        const purchaseValue = supplierTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const salesValue = supplierSalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const totalValue = purchaseValue + salesValue;
        
        const purchaseWeight = supplierTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const salesWeight = supplierSalesTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const totalWeight = purchaseWeight + salesWeight;

        const allTransactionDates = [
          ...supplierTransactions.map(t => t.transaction_date),
          ...supplierSalesTransactions.map(t => t.transaction_date)
        ].filter(Boolean);
        
        const firstTransactionDate = allTransactionDates.length > 0
          ? new Date(Math.min(...allTransactionDates.map(d => new Date(d).getTime()))).toISOString()
          : null;
        
        const lastTransactionDate = allTransactionDates.length > 0
          ? new Date(Math.max(...allTransactionDates.map(d => new Date(d).getTime()))).toISOString()
          : null;
        
        const averageTransactionValue = totalTransactions > 0 ? totalValue / totalTransactions : 0;

        return {
          ...supplier,
          total_transactions: totalTransactions,
          total_value: totalValue,
          total_weight: totalWeight,
          first_transaction_date: firstTransactionDate,
          last_transaction_date: lastTransactionDate,
          average_transaction_value: averageTransactionValue
        };
      });

      setSuppliers(suppliersWithRealStats);
      setLastFetchTime(new Date());
      
      if (suppliersWithRealStats.length > 0) {
        const activeSuppliers = suppliersWithRealStats.filter(s => s.status === 'active').length;
        const totalValue = suppliersWithRealStats.reduce((sum, s) => sum + (s.total_value || 0), 0);
        console.log(`Active suppliers: ${activeSuppliers}, Total business value: KES ${totalValue.toLocaleString()}`);
      }

    } catch (err) {
      console.error('Error fetching suppliers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch suppliers';
      setError(errorMessage);
      if (suppliers.length === 0) {
        setSuppliers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [suppliers.length]);

  // Function to check for duplicate suppliers
  const checkDuplicateSupplier = useCallback(async (name: string, email: string, phone: string, excludeId?: string) => {
    try {
      console.log('Checking for duplicate supplier:', { name, email, phone, excludeId });
      
      // Build query to check for duplicates
      let query = supabase
        .from('suppliers')
        .select('id, name, email, phone')
        .or(`name.ilike.%${name.trim()}%,email.ilike.%${email.trim()}%,phone.ilike.%${phone.trim()}%`);

      const { data, error } = await query;

      if (error) {
        console.error('Error checking for duplicate:', error);
        return { isDuplicate: false, duplicateType: null, existingSupplier: null };
      }

      if (!data || data.length === 0) {
        return { isDuplicate: false, duplicateType: null, existingSupplier: null };
      }

      // Check for exact matches
      const exactNameMatch = data.find(s => 
        s.name.toLowerCase() === name.trim().toLowerCase() && 
        (!excludeId || s.id !== excludeId)
      );
      
      const exactEmailMatch = data.find(s => 
        s.email?.toLowerCase() === email.trim().toLowerCase() && 
        (!excludeId || s.id !== excludeId)
      );
      
      const exactPhoneMatch = data.find(s => 
        s.phone.replace(/\s/g, '') === phone.trim().replace(/\s/g, '') && 
        (!excludeId || s.id !== excludeId)
      );

      if (exactNameMatch) {
        return { 
          isDuplicate: true, 
          duplicateType: 'name', 
          existingSupplier: exactNameMatch,
          message: `A supplier with the name "${exactNameMatch.name}" already exists.`
        };
      }

      if (exactEmailMatch) {
        return { 
          isDuplicate: true, 
          duplicateType: 'email', 
          existingSupplier: exactEmailMatch,
          message: `A supplier with email "${exactEmailMatch.email}" already exists.`
        };
      }

      if (exactPhoneMatch) {
        return { 
          isDuplicate: true, 
          duplicateType: 'phone', 
          existingSupplier: exactPhoneMatch,
          message: `A supplier with phone number "${exactPhoneMatch.phone}" already exists.`
        };
      }

      // Check for similar matches (fuzzy matching for better UX)
      const similarNameMatch = data.find(s => {
        const existingName = s.name.toLowerCase();
        const newName = name.trim().toLowerCase();
        const similarity = existingName.includes(newName) || newName.includes(existingName);
        return similarity && (!excludeId || s.id !== excludeId);
      });

      if (similarNameMatch) {
        return { 
          isDuplicate: true, 
          duplicateType: 'similar_name', 
          existingSupplier: similarNameMatch,
          message: `A supplier with a similar name "${similarNameMatch.name}" already exists. Please check if this is the same supplier.`
        };
      }

      return { isDuplicate: false, duplicateType: null, existingSupplier: null };
      
    } catch (err) {
      console.error('Error in duplicate check:', err);
      return { isDuplicate: false, duplicateType: null, existingSupplier: null };
    }
  }, []);

  const searchSuppliers = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchSuppliers();
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`Searching suppliers with query: "${query}"`);
      
      const [suppliersResult, transactionsResult, salesTransactionsResult] = await Promise.allSettled([
        supabase
          .from('suppliers')
          .select('*')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%,contact_person.ilike.%${query}%,phone.ilike.%${query}%,address.ilike.%${query}%`)
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*'),
        supabase
          .from('sales_transactions')
          .select('*')
      ]);

      if (suppliersResult.status === 'rejected' || suppliersResult.value.error) {
        throw suppliersResult.status === 'rejected' 
          ? suppliersResult.reason 
          : suppliersResult.value.error;
      }

      const rawSuppliers = suppliersResult.value.data || [];
      const transactions = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error
        ? transactionsResult.value.data || []
        : [];
      const salesTransactions = salesTransactionsResult.status === 'fulfilled' && !salesTransactionsResult.value.error
        ? salesTransactionsResult.value.data || []
        : [];

      const suppliersWithRealStats = rawSuppliers.map(supplier => {
        const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
        const supplierSalesTransactions = salesTransactions.filter(t => t.supplier_id === supplier.id);
        
        const purchaseTransactionCount = supplierTransactions.length;
        const salesTransactionCount = supplierSalesTransactions.length;
        const totalTransactions = purchaseTransactionCount + salesTransactionCount;
        
        const purchaseValue = supplierTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const salesValue = supplierSalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const totalValue = purchaseValue + salesValue;
        
        const purchaseWeight = supplierTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const salesWeight = supplierSalesTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const totalWeight = purchaseWeight + salesWeight;

        const allTransactionDates = [
          ...supplierTransactions.map(t => t.transaction_date),
          ...supplierSalesTransactions.map(t => t.transaction_date)
        ].filter(Boolean);
        
        const lastTransactionDate = allTransactionDates.length > 0
          ? new Date(Math.max(...allTransactionDates.map(d => new Date(d).getTime()))).toISOString()
          : null;
        const averageTransactionValue = totalTransactions > 0 ? totalValue / totalTransactions : 0;

        return {
          ...supplier,
          total_transactions: totalTransactions,
          total_value: totalValue,
          total_weight: totalWeight,
          last_transaction_date: lastTransactionDate,
          average_transaction_value: averageTransactionValue
        };
      });

      console.log(`Search returned ${suppliersWithRealStats.length} results with calculated stats`);
      setSuppliers(suppliersWithRealStats);
      
    } catch (err) {
      console.error('Error searching suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to search suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [fetchSuppliers]);

  const filterByTier = useCallback(async (tier: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Filtering suppliers by tier: ${tier}`);
      
      let suppliersQuery = supabase.from('suppliers').select('*');
      if (tier !== 'all') {
        suppliersQuery = suppliersQuery.eq('supplier_tier', tier);
      }

      const [suppliersResult, transactionsResult, salesTransactionsResult] = await Promise.allSettled([
        suppliersQuery.order('created_at', { ascending: false }),
        supabase.from('transactions').select('*'),
        supabase.from('sales_transactions').select('*')
      ]);

      if (suppliersResult.status === 'rejected' || suppliersResult.value.error) {
        throw suppliersResult.status === 'rejected' 
          ? suppliersResult.reason 
          : suppliersResult.value.error;
      }

      const rawSuppliers = suppliersResult.value.data || [];
      const transactions = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error
        ? transactionsResult.value.data || []
        : [];
      const salesTransactions = salesTransactionsResult.status === 'fulfilled' && !salesTransactionsResult.value.error
        ? salesTransactionsResult.value.data || []
        : [];

      const suppliersWithRealStats = rawSuppliers.map(supplier => {
        const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
        const supplierSalesTransactions = salesTransactions.filter(t => t.supplier_id === supplier.id);
        
        const purchaseTransactionCount = supplierTransactions.length;
        const salesTransactionCount = supplierSalesTransactions.length;
        const totalTransactions = purchaseTransactionCount + salesTransactionCount;
        
        const purchaseValue = supplierTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const salesValue = supplierSalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const totalValue = purchaseValue + salesValue;
        
        const purchaseWeight = supplierTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const salesWeight = supplierSalesTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const totalWeight = purchaseWeight + salesWeight;

        const allTransactionDates = [
          ...supplierTransactions.map(t => t.transaction_date),
          ...supplierSalesTransactions.map(t => t.transaction_date)
        ].filter(Boolean);
        
        const lastTransactionDate = allTransactionDates.length > 0
          ? new Date(Math.max(...allTransactionDates.map(d => new Date(d).getTime()))).toISOString()
          : null;
        const averageTransactionValue = totalTransactions > 0 ? totalValue / totalTransactions : 0;

        return {
          ...supplier,
          total_transactions: totalTransactions,
          total_value: totalValue,
          total_weight: totalWeight,
          last_transaction_date: lastTransactionDate,
          average_transaction_value: averageTransactionValue
        };
      });

      console.log(`Filter returned ${suppliersWithRealStats.length} suppliers for tier: ${tier}`);
      setSuppliers(suppliersWithRealStats);
      
    } catch (err) {
      console.error('Error filtering suppliers:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterByStatus = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Filtering suppliers by status: ${status}`);
      
      let suppliersQuery = supabase.from('suppliers').select('*');
      if (status !== 'all') {
        suppliersQuery = suppliersQuery.eq('status', status);
      }

      const [suppliersResult, transactionsResult, salesTransactionsResult] = await Promise.allSettled([
        suppliersQuery.order('created_at', { ascending: false }),
        supabase.from('transactions').select('*'),
        supabase.from('sales_transactions').select('*')
      ]);

      if (suppliersResult.status === 'rejected' || suppliersResult.value.error) {
        throw suppliersResult.status === 'rejected' 
          ? suppliersResult.reason 
          : suppliersResult.value.error;
      }

      const rawSuppliers = suppliersResult.value.data || [];
      const transactions = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error
        ? transactionsResult.value.data || []
        : [];
      const salesTransactions = salesTransactionsResult.status === 'fulfilled' && !salesTransactionsResult.value.error
        ? salesTransactionsResult.value.data || []
        : [];

      const suppliersWithRealStats = rawSuppliers.map(supplier => {
        const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
        const supplierSalesTransactions = salesTransactions.filter(t => t.supplier_id === supplier.id);
        
        const purchaseTransactionCount = supplierTransactions.length;
        const salesTransactionCount = supplierSalesTransactions.length;
        const totalTransactions = purchaseTransactionCount + salesTransactionCount;
        
        const purchaseValue = supplierTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const salesValue = supplierSalesTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const totalValue = purchaseValue + salesValue;
        
        const purchaseWeight = supplierTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const salesWeight = supplierSalesTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        const totalWeight = purchaseWeight + salesWeight;

        const allTransactionDates = [
          ...supplierTransactions.map(t => t.transaction_date),
          ...supplierSalesTransactions.map(t => t.transaction_date)
        ].filter(Boolean);
        
        const lastTransactionDate = allTransactionDates.length > 0
          ? new Date(Math.max(...allTransactionDates.map(d => new Date(d).getTime()))).toISOString()
          : null;
        const averageTransactionValue = totalTransactions > 0 ? totalValue / totalTransactions : 0;

        return {
          ...supplier,
          total_transactions: totalTransactions,
          total_value: totalValue,
          total_weight: totalWeight,
          last_transaction_date: lastTransactionDate,
          average_transaction_value: averageTransactionValue
        };
      });

      console.log(`Status filter returned ${suppliersWithRealStats.length} suppliers`);
      setSuppliers(suppliersWithRealStats);
      
    } catch (err) {
      console.error('Error filtering suppliers by status:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addSupplier = useCallback(async (supplierData: SupplierFormData) => {
    try {
      console.log('Adding new supplier:', supplierData.name);
      
      // Check for duplicates before adding
      const duplicateCheck = await checkDuplicateSupplier(
        supplierData.name,
        supplierData.email,
        supplierData.phone
      );

      if (duplicateCheck.isDuplicate) {
        throw new Error(duplicateCheck.message || 'Duplicate supplier found');
      }

      const newSupplierData = {
        name: supplierData.name.trim(),
        email: supplierData.email.trim().toLowerCase(),
        phone: supplierData.phone.trim(),
        address: supplierData.address.trim(),
        material_types: supplierData.material_types.filter(Boolean),
        status: supplierData.status,
        contact_person: supplierData.contact_person.trim() || null,
        website: supplierData.website.trim() || null,
        notes: supplierData.notes.trim() || null,
        supplier_tier: supplierData.supplier_tier || 'occasional',
        credit_limit: supplierData.credit_limit || 0,
        preferred_payment_method: supplierData.preferred_payment_method || 'cash',
        registration_reason: supplierData.registration_reason.trim() || null,
        total_transactions: 0,
        total_value: 0,
        total_weight: 0,
        registered_date: new Date().toISOString(),
        registered_by: 'admin'
      };

      const { data, error: insertError } = await supabase
        .from('suppliers')
        .insert(newSupplierData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('Successfully added supplier:', data.name);
      
      setSuppliers(prev => [data, ...prev]);
      return data;
      
    } catch (err) {
      console.error('Error adding supplier:', err);
      throw err instanceof Error ? err : new Error('Failed to add supplier');
    }
  }, [checkDuplicateSupplier]);

  const updateSupplier = useCallback(async (supplierId: string, updateData: Partial<SupplierFormData>) => {
    try {
      console.log('Updating supplier:', supplierId);
      
      // Get existing supplier data for comparison
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (!existingSupplier) {
        throw new Error('Supplier not found');
      }

      // Check if name, email, or phone changed
      const nameChanged = updateData.name && updateData.name.trim() !== existingSupplier.name;
      const emailChanged = updateData.email && updateData.email.trim().toLowerCase() !== existingSupplier.email?.toLowerCase();
      const phoneChanged = updateData.phone && updateData.phone.trim() !== existingSupplier.phone;

      // Only check for duplicates if relevant fields changed
      if (nameChanged || emailChanged || phoneChanged) {
        const duplicateCheck = await checkDuplicateSupplier(
          updateData.name || existingSupplier.name,
          updateData.email || existingSupplier.email,
          updateData.phone || existingSupplier.phone,
          supplierId // Exclude current supplier from duplicate check
        );

        if (duplicateCheck.isDuplicate) {
          throw new Error(duplicateCheck.message || 'Duplicate supplier found');
        }
      }

      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error: updateError } = await supabase
        .from('suppliers')
        .update(updatePayload)
        .eq('id', supplierId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log('Successfully updated supplier');
      
      setSuppliers(prev => prev.map(supplier => 
        supplier.id === supplierId ? { ...supplier, ...data } : supplier
      ));
      
      return data;
      
    } catch (err) {
      console.error('Error updating supplier:', err);
      throw err instanceof Error ? err : new Error('Failed to update supplier');
    }
  }, [checkDuplicateSupplier]);

  const deleteSupplier = useCallback(async (supplierId: string) => {
    try {
      console.log('Deleting supplier:', supplierId);
      
      const { error: deleteError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (deleteError) {
        throw deleteError;
      }

      console.log('Successfully deleted supplier');
      
      setSuppliers(prev => prev.filter(supplier => supplier.id !== supplierId));
      
    } catch (err) {
      console.error('Error deleting supplier:', err);
      throw err instanceof Error ? err : new Error('Failed to delete supplier');
    }
  }, []);

  useEffect(() => {
    console.log('Setting up suppliers realtime subscription...');

    const suppliersChannel = supabase
      .channel('suppliers-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('Supplier realtime update received:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              const newSupplier = payload.new as Supplier;
              setSuppliers(prev => {
                if (prev.some(s => s.id === newSupplier.id)) {
                  return prev;
                }
                return [newSupplier, ...prev];
              });
              break;
              
            case 'UPDATE':
              const updatedSupplier = payload.new as Supplier;
              setSuppliers(prev => prev.map(supplier => 
                supplier.id === updatedSupplier.id ? updatedSupplier : supplier
              ));
              break;
              
            case 'DELETE':
              const deletedSupplierId = payload.old?.id;
              if (deletedSupplierId) {
                setSuppliers(prev => prev.filter(supplier => supplier.id !== deletedSupplierId));
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('Suppliers realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          console.log('Successfully subscribed to suppliers updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRealtimeConnected(false);
          console.error('Suppliers realtime connection error');
        } else if (status === 'CLOSED') {
          setIsRealtimeConnected(false);
        }
      });

    return () => {
      console.log('Cleaning up suppliers realtime subscription...');
      supabase.removeChannel(suppliersChannel);
      setIsRealtimeConnected(false);
    };
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing suppliers data...');
      fetchSuppliers();
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchSuppliers]);

  return {
    suppliers,
    loading,
    error,
    isRealtimeConnected,
    lastFetchTime,
    fetchSuppliers,
    searchSuppliers,
    filterByTier,
    filterByStatus,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    checkDuplicateSupplier
  };
};

// Supplier Details Modal with Transactions
const SupplierDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}> = ({ isOpen, onClose, supplier }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'sales'>('overview');

  const fetchSupplierTransactions = async (supplierId: string) => {
    try {
      setLoading(true);
      
      const [purchasesResult, salesResult] = await Promise.allSettled([
        supabase
          .from('transactions')
          .select('*')
          .eq('supplier_id', supplierId)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('sales_transactions')
          .select('*')
          .eq('supplier_id', supplierId)
          .order('transaction_date', { ascending: false })
      ]);

      const purchases = purchasesResult.status === 'fulfilled' && !purchasesResult.value.error
        ? purchasesResult.value.data || []
        : [];
      
      const sales = salesResult.status === 'fulfilled' && !salesResult.value.error
        ? salesResult.value.data || []
        : [];

      const allTransactions = [
        ...purchases.map(t => ({ ...t, transaction_type: 'Purchase' })),
        ...sales.map(t => ({ ...t, transaction_type: 'Sale' }))
      ].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      setTransactions(allTransactions);
      
    } catch (err) {
      console.error('Error fetching supplier transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supplier && isOpen) {
      fetchSupplierTransactions(supplier.id);
    }
  }, [supplier, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTransactions([]);
      setActiveTab('overview');
    }
  }, [isOpen]);

  if (!isOpen || !supplier) return null;

  const purchases = transactions.filter(t => t.transaction_type === 'Purchase');
  const sales = transactions.filter(t => t.transaction_type === 'Sale');

  const purchaseValue = purchases.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const salesValue = sales.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const netValue = salesValue - purchaseValue;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{supplier.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{supplier.email} • {supplier.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'purchases'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Purchases ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'sales'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Sales ({sales.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700 font-medium">Total Transactions</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{transactions.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700 font-medium">Total Value</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        KES {((purchaseValue + salesValue) / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-700 font-medium">Total Weight</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {((supplier.total_weight || 0) / 1000).toFixed(1)}T
                      </p>
                    </div>
                    <div className={`rounded-lg p-4 ${netValue >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <p className={`text-sm font-medium ${netValue >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        Net Position
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${netValue >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                        KES {(netValue / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Supplier Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Address</p>
                        <p className="font-medium text-gray-900">{supplier.address}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Contact Person</p>
                        <p className="font-medium text-gray-900">{supplier.contact_person || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Materials</p>
                        <p className="font-medium text-gray-900">{supplier.material_types.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Supplier Tier</p>
                        <p className="font-medium text-gray-900 capitalize">{supplier.supplier_tier || 'Occasional'}</p>
                      </div>
                      {supplier.credit_limit && supplier.credit_limit > 0 && (
                        <div>
                          <p className="text-gray-600">Credit Limit</p>
                          <p className="font-medium text-gray-900">KES {supplier.credit_limit.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Preferred Payment</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {supplier.preferred_payment_method?.replace('_', ' ') || 'Cash'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {supplier.first_transaction_date && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Transaction Timeline</h3>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-gray-600">First Transaction</p>
                          <p className="font-medium text-gray-900">
                            {new Date(supplier.first_transaction_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600">Average Value</p>
                          <p className="font-medium text-gray-900">
                            KES {(supplier.average_transaction_value || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600">Last Transaction</p>
                          <p className="font-medium text-gray-900">
                            {supplier.last_transaction_date 
                              ? new Date(supplier.last_transaction_date).toLocaleDateString()
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {transactions.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Recent Transactions</h3>
                      <div className="space-y-2">
                        {transactions.slice(0, 5).map((tx) => (
                          <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  tx.transaction_type === 'Purchase' ? 'bg-blue-500' : 'bg-green-500'
                                }`}></div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {tx.transaction_number || tx.transaction_id || tx.id}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(tx.transaction_date).toLocaleDateString()} • {tx.material_type || tx.material_name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 text-sm">
                                  KES {(tx.total_amount || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">{tx.weight_kg || 0} kg</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'purchases' && (
                <div className="space-y-3">
                  {purchases.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No purchase transactions found</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-blue-700">Transactions</p>
                            <p className="text-xl font-bold text-blue-900">{purchases.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-700">Total Value</p>
                            <p className="text-xl font-bold text-blue-900">
                              KES {(purchaseValue / 1000).toFixed(0)}K
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-700">Total Weight</p>
                            <p className="text-xl font-bold text-blue-900">
                              {(purchases.reduce((sum, t) => sum + (t.weight_kg || 0), 0) / 1000).toFixed(1)}T
                            </p>
                          </div>
                        </div>
                      </div>

                      {purchases.map((tx) => (
                        <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {tx.transaction_number || tx.id}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(tx.transaction_date).toLocaleDateString()} at{' '}
                                {new Date(tx.transaction_date).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              tx.payment_status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {tx.payment_status || 'pending'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Material</p>
                              <p className="font-medium text-gray-900">{tx.material_type}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Weight</p>
                              <p className="font-medium text-gray-900">{tx.weight_kg || 0} kg</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Unit Price</p>
                              <p className="font-medium text-gray-900">KES {tx.unit_price || 0}/kg</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total Amount</p>
                              <p className="font-semibold text-gray-900">
                                KES {(tx.total_amount || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {tx.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600 italic">{tx.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'sales' && (
                <div className="space-y-3">
                  {sales.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No sales transactions found</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-green-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-green-700">Transactions</p>
                            <p className="text-xl font-bold text-green-900">{sales.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700">Total Value</p>
                            <p className="text-xl font-bold text-green-900">
                              KES {(salesValue / 1000).toFixed(0)}K
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-green-700">Total Weight</p>
                            <p className="text-xl font-bold text-green-900">
                              {(sales.reduce((sum, t) => sum + (t.weight_kg || 0), 0) / 1000).toFixed(1)}T
                            </p>
                          </div>
                        </div>
                      </div>

                      {sales.map((tx) => (
                        <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {tx.transaction_id || tx.id}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(tx.transaction_date).toLocaleDateString()} at{' '}
                                {new Date(tx.transaction_date).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              tx.payment_status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {tx.payment_status || 'pending'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Material</p>
                              <p className="font-medium text-gray-900">{tx.material_name}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Weight</p>
                              <p className="font-medium text-gray-900">{tx.weight_kg || 0} kg</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Price per kg</p>
                              <p className="font-medium text-gray-900">KES {tx.price_per_kg || 0}/kg</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total Amount</p>
                              <p className="font-semibold text-gray-900">
                                KES {(tx.total_amount || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {tx.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600 italic">{tx.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Empty State Component
const EmptyState: React.FC<{ onAddSupplier: () => void; hasFiltersApplied: boolean }> = ({ onAddSupplier, hasFiltersApplied }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full p-6 mb-4">
      <AlertCircle className="h-16 w-16 text-blue-500" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Suppliers Found</h3>
    <p className="text-gray-600 text-center max-w-md mb-6">
      {hasFiltersApplied
        ? "No suppliers match your current filters. Try adjusting your search or filter criteria."
        : "You haven't registered any suppliers yet. Start by adding your first supplier to begin tracking your business relationships."
      }
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mb-4">
      <h4 className="font-semibold text-blue-900 mb-2">Getting Started</h4>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• Click the "Add Supplier" button to register new suppliers</li>
        <li>• Fill in supplier details and contact information</li>
        <li>• Start tracking transactions and building relationships</li>
        <li>• Monitor supplier performance and manage tiers</li>
      </ul>
    </div>
    <button
      onClick={onAddSupplier}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
    >
      <Plus size={20} />
      Add Your First Supplier
    </button>
  </div>
);

// Delete Confirmation Modal
const DeleteConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  supplierName: string;
  isDeleting: boolean;
}> = ({ isOpen, onClose, onConfirm, supplierName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 rounded-full p-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Supplier</h2>
          <p className="text-gray-600 text-center mb-6">
            Are you sure you want to delete <span className="font-semibold">{supplierName}</span>?
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-red-900 mb-2">⚠️ Warning</h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• This action cannot be undone</li>
              <li>• Supplier information will be permanently removed</li>
              <li>• Transaction records will remain in the database</li>
              <li>• This will not affect financial records</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Supplier
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Duplicate Supplier Warning Modal
const DuplicateSupplierWarning: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  duplicateType: string;
  existingSupplier: any;
  newSupplierData: SupplierFormData;
}> = ({ isOpen, onClose, onContinue, duplicateType, existingSupplier, newSupplierData }) => {
  if (!isOpen || !existingSupplier) return null;

  const getDuplicateMessage = () => {
    switch (duplicateType) {
      case 'name':
        return `A supplier named "${existingSupplier.name}" already exists.`;
      case 'email':
        return `A supplier with email "${existingSupplier.email}" already exists.`;
      case 'phone':
        return `A supplier with phone "${existingSupplier.phone}" already exists.`;
      case 'similar_name':
        return `A supplier with similar name "${existingSupplier.name}" already exists.`;
      default:
        return 'A similar supplier already exists.';
    }
  };

 const compareFields = () => {
  const fields: ('Name' | 'Email' | 'Phone')[] = [];
  
  if (newSupplierData.name.toLowerCase() === existingSupplier.name.toLowerCase()) {
    fields.push('Name');
  }
  if (newSupplierData.email.toLowerCase() === existingSupplier.email?.toLowerCase()) {
    fields.push('Email');
  }
  if (newSupplierData.phone.replace(/\s/g, '') === existingSupplier.phone?.replace(/\s/g, '')) {
    fields.push('Phone');
  }
  
  return fields.join(', ');
};

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-amber-100 rounded-full p-3">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Possible Duplicate Supplier</h2>
          <p className="text-gray-600 text-center mb-4">{getDuplicateMessage()}</p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-amber-900 mb-2">⚠️ Duplicate Check</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-amber-800">Matching Fields:</span>
                <span className="font-medium">{compareFields()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800">Existing Supplier:</span>
                <span className="font-medium">{existingSupplier.name}</span>
              </div>
              {existingSupplier.contact_person && (
                <div className="flex justify-between">
                  <span className="text-amber-800">Contact Person:</span>
                  <span className="font-medium">{existingSupplier.contact_person}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Recommendation</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check if this is the same supplier before proceeding</li>
              <li>• Consider updating the existing supplier instead</li>
              <li>• If it's a different supplier, add unique identifiers</li>
              <li>• Use different contact information to avoid confusion</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel & Review
            </button>
            <button
              onClick={onContinue}
              className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
            >
              <AlertCircle size={16} />
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Unified Supplier Form Modal (Add/Edit) with Duplicate Validation
const SupplierFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (supplierData: SupplierFormData) => Promise<void>;
  isSubmitting: boolean;
  editMode?: boolean;
  initialData?: SupplierFormData | null;
  onCheckDuplicate?: (name: string, email: string, phone: string, excludeId?: string) => Promise<any>;
  selectedSupplierId?: string;
}> = ({ isOpen, onClose, onSubmit, isSubmitting, editMode = false, initialData = null, onCheckDuplicate, selectedSupplierId }) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    material_types: [],
    status: 'active',
    contact_person: '',
    website: '',
    notes: '',
    supplier_tier: 'occasional',
    credit_limit: 0,
    preferred_payment_method: 'cash',
    registration_reason: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    type: string;
    existingSupplier: any;
  }>({
    show: false,
    type: '',
    existingSupplier: null
  });
  const [showContinueButton, setShowContinueButton] = useState(false);

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (editMode && initialData) {
      console.log('Setting form data from initialData:', initialData);
      setFormData(initialData);
    } else if (!editMode) {
      // Reset form for add mode
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        material_types: [],
        status: 'active',
        contact_person: '',
        website: '',
        notes: '',
        supplier_tier: 'occasional',
        credit_limit: 0,
        preferred_payment_method: 'cash',
        registration_reason: ''
      });
    }
    // Reset errors when modal opens/closes
    setErrors({});
    setSubmitError('');
    setDuplicateWarning({ show: false, type: '', existingSupplier: null });
    setShowContinueButton(false);
  }, [editMode, initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'credit_limit' ? parseFloat(value) || 0 : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (submitError) {
      setSubmitError('');
    }
  };

  const handleMaterialTypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const materialTypesString = e.target.value;
    const materialTypesArray = materialTypesString
      .split(',')
      .map(type => type.trim())
      .filter(Boolean);
    
    setFormData(prev => ({
      ...prev,
      material_types: materialTypesArray
    }));
    
    if (errors.material_types) {
      setErrors(prev => ({ ...prev, material_types: '' }));
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (formData.material_types.length === 0) newErrors.material_types = 'At least one material type is required';
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.phone && !/^[\d+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (formData.website && formData.website.trim() && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website URL must start with http:// or https://';
    }
    
    if (formData.credit_limit < 0) {
      newErrors.credit_limit = 'Credit limit cannot be negative';
    }
    
    setErrors(newErrors);
    
    // Return false if there are basic validation errors
    if (Object.keys(newErrors).length > 0) {
      return false;
    }

    // Check for duplicates if we have the check function
    if (onCheckDuplicate && !editMode) {
      setIsCheckingDuplicate(true);
      try {
        const duplicateCheck = await onCheckDuplicate(
          formData.name,
          formData.email,
          formData.phone
        );

        if (duplicateCheck.isDuplicate) {
          setDuplicateWarning({
            show: true,
            type: duplicateCheck.duplicateType || 'unknown',
            existingSupplier: duplicateCheck.existingSupplier
          });
          setIsCheckingDuplicate(false);
          return false;
        }
      } catch (error) {
        console.error('Error checking for duplicates:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    
    const isValid = await validateForm();
    if (!isValid) return;
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting supplier form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit supplier form');
    }
  };

  const handleContinueAnyway = async () => {
    setDuplicateWarning({ show: false, type: '', existingSupplier: null });
    setShowContinueButton(true);
    
    // Wait a moment for state update, then submit
    setTimeout(() => {
      const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as any;
      handleSubmit(formEvent);
    }, 100);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      material_types: [],
      status: 'active',
      contact_person: '',
      website: '',
      notes: '',
      supplier_tier: 'occasional',
      credit_limit: 0,
      preferred_payment_method: 'cash',
      registration_reason: ''
    });
    setErrors({});
    setSubmitError('');
    setDuplicateWarning({ show: false, type: '', existingSupplier: null });
    setShowContinueButton(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl w-full max-w-lg h-[70vh] sm:h-[65vh] md:h-[70vh] flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200/50 bg-white/80 backdrop-blur rounded-t-2xl">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                {editMode ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editMode ? 'Update supplier information' : 'Register a new supplier for your business'}
              </p>
            </div>
            <button onClick={handleClose} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <p className="text-sm text-red-800">{submitError}</p>
                </div>
              </div>
            )}
            
            {/* Duplicate Check Indicator */}
            {!editMode && onCheckDuplicate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-blue-600" />
                  <p className="text-sm text-blue-800">
                    System will automatically check for duplicate suppliers before saving.
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter company or supplier name"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="contact_person" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        id="contact_person"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Primary contact name"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="+254 xxx xxx xxx"
                      />
                      {errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="supplier@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Business Address *
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className={`w-full px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Full business address"
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-0.5">{errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="status" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="website" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className={`w-full px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.website ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="https://example.com"
                      />
                      {errors.website && <p className="text-red-500 text-xs mt-0.5">{errors.website}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Business Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="supplier_tier" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Supplier Tier
                      </label>
                      <select
                        id="supplier_tier"
                        name="supplier_tier"
                        value={formData.supplier_tier}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="occasional">Occasional</option>
                        <option value="regular">Regular</option>
                        <option value="strategic">Strategic</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="preferred_payment_method" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        id="preferred_payment_method"
                        name="preferred_payment_method"
                        value={formData.preferred_payment_method}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="credit_limit" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Credit Limit (KES)
                      </label>
                      <input
                        type="number"
                        id="credit_limit"
                        name="credit_limit"
                        value={formData.credit_limit}
                        onChange={handleChange}
                        className={`w-full px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.credit_limit ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0"
                        min="0"
                      />
                      {errors.credit_limit && <p className="text-red-500 text-xs mt-0.5">{errors.credit_limit}</p>}
                    </div>

                    <div>
                      <label htmlFor="registration_reason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Registration Reason
                      </label>
                      <input
                        type="text"
                        id="registration_reason"
                        name="registration_reason"
                        value={formData.registration_reason}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Why register this supplier?"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="material_types" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Material Types *
                    </label>
                    <input
                      type="text"
                      id="material_types"
                      name="material_types"
                      value={formData.material_types.join(', ')}
                      onChange={handleMaterialTypesChange}
                      className={`w-full px-3 py-1.5 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.material_types ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Steel, Aluminum, Copper, Brass"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple materials with commas</p>
                    {errors.material_types && <p className="text-red-500 text-xs mt-0.5">{errors.material_types}</p>}
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional information about this supplier..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-gray-200/50 bg-white/80 backdrop-blur rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isCheckingDuplicate}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting || isCheckingDuplicate ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {isCheckingDuplicate ? 'Checking...' : editMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  {editMode ? <Edit2 size={14} /> : <Plus size={14} />}
                  {editMode ? 'Update Supplier' : 'Add Supplier'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Modal */}
      <DuplicateSupplierWarning
        isOpen={duplicateWarning.show}
        onClose={() => setDuplicateWarning({ show: false, type: '', existingSupplier: null })}
        onContinue={handleContinueAnyway}
        duplicateType={duplicateWarning.type}
        existingSupplier={duplicateWarning.existingSupplier}
        newSupplierData={formData}
      />
    </>
  );
};

// Enhanced Stats Bar Component
const SuppliersStatsBar: React.FC<{
  totalSuppliers: number;
  activeSuppliers: number;
  totalValue: number;
  totalTransactions: number;
  isLoading: boolean;
}> = ({ totalSuppliers, activeSuppliers, totalValue, totalTransactions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={24} />
          <span className="ml-2 text-blue-700">Loading statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl p-4 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalSuppliers}</div>
          <div className="text-sm text-blue-700">Total Suppliers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{activeSuppliers}</div>
          <div className="text-sm text-green-700">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">KES {(totalValue / 1000).toFixed(0)}K</div>
          <div className="text-sm text-purple-700">Total Value</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{totalTransactions}</div>
          <div className="text-sm text-orange-700">Transactions</div>
        </div>
      </div>
    </div>
  );
};

// Main Enhanced Suppliers Component
const Suppliers: React.FC<SuppliersProps> = ({ onSupplierUpdate }) => {
  const {
    suppliers,
    loading,
    error,
    isRealtimeConnected,
    lastFetchTime,
    searchSuppliers,
    filterByTier,
    filterByStatus,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    checkDuplicateSupplier
  } = useSuppliers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTierValue, setFilterTierValue] = useState<string>('all');
  const [filterStatusValue, setFilterStatusValue] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [editFormData, setEditFormData] = useState<SupplierFormData | null>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      await searchSuppliers(term);
    } else {
      await fetchSuppliers();
    }
  };

  const handleTierFilter = async (tier: string) => {
    setFilterTierValue(tier);
    setFilterStatusValue('all');
    await filterByTier(tier);
  };

  const handleStatusFilter = async (status: string) => {
    setFilterStatusValue(status);
    setFilterTierValue('all');
    await filterByStatus(status);
  };

  const handleAddSupplier = async (supplierData: SupplierFormData) => {
    setIsSubmitting(true);
    try {
      await addSupplier(supplierData);
      setIsAddModalOpen(false);
      console.log('Supplier added successfully');
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    // Convert supplier data to form data format
    const formData: SupplierFormData = {
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      material_types: supplier.material_types || [],
      status: (supplier.status as 'active' | 'inactive') || 'active',
      contact_person: supplier.contact_person || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
      supplier_tier: supplier.supplier_tier || 'occasional',
      credit_limit: supplier.credit_limit || 0,
      preferred_payment_method: supplier.preferred_payment_method || 'cash',
      registration_reason: supplier.registration_reason || ''
    };
    
    console.log('Setting edit form data:', formData);
    setEditFormData(formData);
    setSelectedSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleUpdateSupplier = async (supplierData: SupplierFormData) => {
    if (!selectedSupplier) return;
    
    setIsSubmitting(true);
    try {
      console.log('Updating supplier with data:', supplierData);
      await updateSupplier(selectedSupplier.id, supplierData);
      setIsEditModalOpen(false);
      setSelectedSupplier(null);
      setEditFormData(null);
      console.log('Supplier updated successfully');
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteSupplier(supplierToDelete.id);
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
      console.log('Supplier deleted successfully');
    } catch (error) {
      console.error('Error deleting supplier:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailsModalOpen(true);
  };

  const getTierInfo = (supplier: Supplier) => {
    const tier = supplier.supplier_tier || 'occasional';
    
    switch (tier) {
      case 'strategic':
        return { label: 'Strategic Partner', color: 'bg-purple-100 text-purple-700', icon: '⭐' };
      case 'regular':
        return { label: 'Regular', color: 'bg-blue-100 text-blue-700', icon: '🔵' };
      case 'occasional':
        return { label: 'Occasional', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' };
      default:
        return { label: 'Occasional', color: 'bg-gray-100 text-gray-700', icon: '⚪' };
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mpesa':
        return '📱';
      case 'bank_transfer':
        return '🏦';
      case 'cheque':
        return '📄';
      default:
        return '💵';
    }
  };

  // Calculate stats
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const totalValue = suppliers.reduce((sum, s) => sum + (s.total_value || 0), 0);
  const totalTransactions = suppliers.reduce((sum, s) => sum + (s.total_transactions || 0), 0);

  // Find potential duplicates (for display purposes)
  const findPotentialDuplicates = useCallback(() => {
    const duplicates: { [key: string]: Supplier[] } = {};
    
    suppliers.forEach(supplier => {
      const key = `${supplier.name.toLowerCase().trim()}_${supplier.email?.toLowerCase().trim()}_${supplier.phone?.trim()}`;
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(supplier);
    });

    // Filter to only show groups with more than 1 supplier
    const result = Object.values(duplicates).filter(group => group.length > 1);
    return result;
  }, [suppliers]);

  const potentialDuplicates = findPotentialDuplicates();

  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
            <p className="text-gray-600 text-lg">Loading suppliers from database...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 sm:px-6 py-6 rounded-lg max-w-lg mx-auto">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 mr-3" />
              <div>
                <p className="font-bold text-lg">Error Loading Suppliers</p>
                <p className="text-sm mt-1">Failed to connect to database</p>
              </div>
            </div>
            <p className="text-sm mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={fetchSuppliers}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      {/* Header with connection status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Suppliers</h2>
          <p className="text-gray-600 text-sm sm:text-base">Manage your supplier relationships and track business performance</p>
          {lastFetchTime && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastFetchTime.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {/* Connection Status - Desktop only */}
        {!isMobile && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isRealtimeConnected ? 'text-green-600' : 'text-red-600'}>
              {isRealtimeConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <SuppliersStatsBar
        totalSuppliers={totalSuppliers}
        activeSuppliers={activeSuppliers}
        totalValue={totalValue}
        totalTransactions={totalTransactions}
        isLoading={loading}
      />
      
      {/* Duplicate Warning Banner */}
      {potentialDuplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 text-sm">Potential Duplicates Found</h3>
              <p className="text-amber-800 text-xs mt-1">
                Found {potentialDuplicates.length} potential duplicate supplier groups. 
                <button 
                  onClick={() => alert(`Found ${potentialDuplicates.length} duplicate groups. Please review supplier records.`)}
                  className="ml-2 text-amber-900 hover:text-amber-700 underline font-medium"
                >
                  Review Now
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and Filter Controls */}
      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search suppliers by name, email, contact person, or phone..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Filter and Add Button Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <select
                value={filterTierValue}
                onChange={(e) => handleTierFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="all">All Tiers</option>
                <option value="strategic">Strategic</option>
                <option value="regular">Regular</option>
                <option value="occasional">Occasional</option>
              </select>
            </div>
            
            <div className="relative flex-1">
              <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <select
                value={filterStatusValue}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Supplier</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suppliers Display */}
      {suppliers.length === 0 ? (
        <EmptyState 
          onAddSupplier={() => setIsAddModalOpen(true)} 
          hasFiltersApplied={searchTerm.trim() !== '' || filterTierValue !== 'all' || filterStatusValue !== 'all'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {suppliers.map((supplier) => {
            const tierInfo = getTierInfo(supplier);
            const paymentIcon = getPaymentMethodIcon(supplier.preferred_payment_method || 'cash');
            
            return (
              <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">{supplier.name}</h3>
                    {supplier.contact_person && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">Contact: {supplier.contact_person}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={12} className="sm:w-3.5 sm:h-3.5" />
                      {supplier.address}
                    </p>
                  </div>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${tierInfo.color}`}>
                    {tierInfo.icon} <span className="hidden sm:inline">{tierInfo.label}</span>
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                    <Phone size={12} className="sm:w-3.5 sm:h-3.5" />
                    {supplier.phone}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                    <Mail size={12} className="sm:w-3.5 sm:h-3.5" />
                    {supplier.email}
                  </p>
                  {supplier.website && (
                    <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                      <Globe size={12} className="sm:w-3.5 sm:h-3.5" />
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </p>
                  )}
                  <div className="pt-1.5 sm:pt-2">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Materials:</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {supplier.material_types.length > 0 ? supplier.material_types.join(', ') : 'No materials specified'}
                    </p>
                  </div>
                  <div className="pt-1.5 sm:pt-2">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                      Preferred Payment: {paymentIcon} {supplier.preferred_payment_method?.replace('_', ' ') || 'Cash'}
                    </p>
                    {supplier.credit_limit && supplier.credit_limit > 0 && (
                      <p className="text-xs sm:text-sm text-gray-600">Credit Limit: KES {supplier.credit_limit.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4 pt-3 sm:pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-blue-600">{supplier.total_transactions}</p>
                    <p className="text-xs text-gray-500">Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-blue-600">KES {((supplier.total_value || 0) / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">Total Value</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-blue-600">{supplier.total_weight ? `${(supplier.total_weight / 1000).toFixed(1)}T` : '0T'}</p>
                    <p className="text-xs text-gray-500">Total Weight</p>
                  </div>
                </div>

                {supplier.last_transaction_date && (
                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                      <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
                      Last Transaction: {new Date(supplier.last_transaction_date).toLocaleDateString()}
                    </p>
                    {supplier.average_transaction_value && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Avg. Transaction: KES {supplier.average_transaction_value.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                    supplier.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {supplier.status === 'active' ? '● Active' : '● Inactive'}
                  </span>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                      onClick={() => handleViewDetails(supplier)}
                      className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                      title="View Details"
                    >
                      <Eye size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditSupplier(supplier)}
                      className="p-1.5 sm:p-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-600"
                      title="Edit Supplier"
                    >
                      <Edit2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(supplier)}
                      className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                      title="Delete Supplier"
                    >
                      <Trash2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    {supplier.supplier_tier === 'strategic' && (
                      <div className="p-1.5 sm:p-2" title="Strategic Partner">
                        <Award size={14} className="text-purple-600 sm:w-4 sm:h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Supplier Modal */}
      <SupplierFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSupplier}
        isSubmitting={isSubmitting}
        editMode={false}
        initialData={null}
        onCheckDuplicate={checkDuplicateSupplier}
      />

      {/* Edit Supplier Modal */}
      <SupplierFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSupplier(null);
          setEditFormData(null);
        }}
        onSubmit={handleUpdateSupplier}
        isSubmitting={isSubmitting}
        editMode={true}
        initialData={editFormData}
        selectedSupplierId={selectedSupplier?.id}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSupplierToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        supplierName={supplierToDelete?.name || ''}
        isDeleting={isDeleting}
      />

      {/* Supplier Details Modal */}
      <SupplierDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
      />
    </div>
  );
};

export default Suppliers;