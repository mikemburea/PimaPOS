// src/hooks/useDashboardData.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Types for dashboard data
interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  totalWeight: number;
  activeSuppliers: number;
  todayTransactions: number;
  todayRevenue: number;
  weekGrowth: number;
  monthGrowth: number;
  weightGrowth: number;
  supplierGrowth: number;
  avgTransactionValue: number;
  completedTransactions: number;
  pendingTransactions: number;
}

interface MaterialDistribution {
  name: string;
  value: number;
  color: string;
  count: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  target: number;
}

interface PerformanceMetrics {
  transactions: { value: number; target: number; progress: number };
  revenue: { value: number; target: number; progress: number };
  weight: { value: number; target: number; progress: number };
  suppliers: { value: number; target: number; progress: number };
}

interface TopSupplier {
  id: string;
  name: string;
  totalTransactions: number;
  totalValue: number;
  tier: string;
  trend: string;
  lastTransaction?: string;
}

interface RecentTransaction {
  id: string;
  supplierName: string;
  materialType: string;
  amount: number;
  status: string;
  date: string;
  paymentMethod?: string;
  isWalkin: boolean;
}

interface DashboardData {
  stats: DashboardStats;
  materialDistribution: MaterialDistribution[];
  revenueData: RevenueData[];
  performanceMetrics: PerformanceMetrics;
  topSuppliers: TopSupplier[];
  recentTransactions: RecentTransaction[];
}

interface UseDashboardDataReturn {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useDashboardData = (): UseDashboardDataReturn => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch and process dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [transactionsResult, suppliersResult, materialsResult] = await Promise.allSettled([
        supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('suppliers')
          .select('*')
          .order('total_value', { ascending: false }),
        supabase
          .from('materials')
          .select('*')
          .eq('is_active', true)
      ]);

      // Process results
      const transactions = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error
        ? transactionsResult.value.data || []
        : [];

      const suppliers = suppliersResult.status === 'fulfilled' && !suppliersResult.value.error
        ? suppliersResult.value.data || []
        : [];

      const materials = materialsResult.status === 'fulfilled' && !materialsResult.value.error
        ? materialsResult.value.data || []
        : [];

      // Calculate dashboard data
      const processedData = processDashboardData(transactions, suppliers, materials);
      setDashboardData(processedData);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Process raw data into dashboard format
  const processDashboardData = (transactions: any[], suppliers: any[], materials: any[]): DashboardData => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate basic statistics
    const completedTransactions = transactions.filter(t => t.payment_status === 'completed');
    const pendingTransactions = transactions.filter(t => t.payment_status === 'pending');
    const todayTransactions = transactions.filter(t => new Date(t.transaction_date) >= today);
    const weekTransactions = transactions.filter(t => new Date(t.transaction_date) >= thisWeek);
    const monthTransactions = transactions.filter(t => new Date(t.transaction_date) >= thisMonth);

    const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalWeight = completedTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;

    // Calculate growth percentages
    const weekGrowth = transactions.length > 0 ? (weekTransactions.length / transactions.length) * 100 : 0;
    const monthGrowth = transactions.length > 0 ? (monthTransactions.length / transactions.length) * 100 : 0;
    const weightGrowth = totalWeight > 0 ? (weekTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0) / totalWeight) * 100 : 0;
    const supplierGrowth = activeSuppliers > 0 ? (suppliers.filter(s => new Date(s.created_at) >= thisWeek).length / activeSuppliers) * 100 : 0;

    const stats: DashboardStats = {
      totalTransactions: transactions.length,
      totalRevenue,
      totalWeight,
      activeSuppliers,
      todayTransactions: todayTransactions.length,
      todayRevenue,
      weekGrowth,
      monthGrowth,
      weightGrowth,
      supplierGrowth,
      avgTransactionValue: transactions.length > 0 ? totalRevenue / transactions.length : 0,
      completedTransactions: completedTransactions.length,
      pendingTransactions: pendingTransactions.length
    };

    // Calculate material distribution
    const materialCounts = transactions.reduce((acc, t) => {
      const material = t.material_type || 'Unknown';
      acc[material] = (acc[material] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const materialColors = ['#00bcd4', '#9c27b0', '#e91e63', '#ff9800', '#4caf50', '#3f51b5', '#795548'];
    const materialDistribution: MaterialDistribution[] = Object.entries(materialCounts)
      .map(([name, count], index) => ({
        name,
        value: Math.round((Number(count) / Math.max(transactions.length, 1)) * 100),
        color: materialColors[index % materialColors.length],
        count: Number(count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Generate revenue data for last 7 days
    const revenueData: RevenueData[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.transaction_date);
        return tDate.toDateString() === date.toDateString();
      });
      const dayRevenue = dayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const target = Math.max(dayRevenue * 1.1, 10000); // 10% above current or minimum 10K
      
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue,
        target
      };
    });

    // Calculate performance metrics
    const dailyTransactionTarget = 50;
    const dailyRevenueTarget = 100000;
    const dailyWeightTarget = 5000;
    const dailySupplierTarget = 20;

    const todayWeight = todayTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
    const todayUniqueSuppliers = new Set(
      todayTransactions.map(t => t.supplier_id || t.walkin_name || 'unknown')
    ).size;

    const performanceMetrics: PerformanceMetrics = {
      transactions: {
        value: todayTransactions.length,
        target: dailyTransactionTarget,
        progress: Math.min((todayTransactions.length / dailyTransactionTarget) * 100, 100)
      },
      revenue: {
        value: todayRevenue,
        target: dailyRevenueTarget,
        progress: Math.min((todayRevenue / dailyRevenueTarget) * 100, 100)
      },
      weight: {
        value: todayWeight,
        target: dailyWeightTarget,
        progress: Math.min((todayWeight / dailyWeightTarget) * 100, 100)
      },
      suppliers: {
        value: todayUniqueSuppliers,
        target: dailySupplierTarget,
        progress: Math.min((todayUniqueSuppliers / dailySupplierTarget) * 100, 100)
      }
    };

    // Get top suppliers
    const topSuppliers: TopSupplier[] = suppliers
      .filter(s => s.status === 'active')
      .sort((a, b) => (b.total_value || 0) - (a.total_value || 0))
      .slice(0, 5)
      .map(supplier => {
        const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
        const recentTransactions = supplierTransactions.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return transactionDate >= lastMonth;
        });
        
        const recentValue = recentTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const trend = recentValue > 0 ? `+${Math.round((recentValue / Math.max(supplier.total_value || 1, 1)) * 100)}%` : '+0%';
        
        return {
          id: supplier.id,
          name: supplier.name,
          totalTransactions: supplier.total_transactions || 0,
          totalValue: supplier.total_value || 0,
          tier: supplier.supplier_tier || 'occasional',
          trend,
          lastTransaction: supplier.last_transaction_date || undefined
        };
      });

    // Get recent transactions
    const recentTransactions: RecentTransaction[] = transactions
      .slice(0, 5)
      .map(transaction => {
        const supplier = suppliers.find(s => s.id === transaction.supplier_id);
        const supplierName = transaction.is_walkin 
          ? (transaction.walkin_name || 'Walk-in Customer')
          : (supplier?.name || 'Unknown Supplier');

        return {
          id: transaction.id,
          supplierName,
          materialType: transaction.material_type || 'Unknown',
          amount: transaction.total_amount || 0,
          status: transaction.payment_status || 'pending',
          date: transaction.transaction_date,
          paymentMethod: transaction.payment_method || 'Cash',
          isWalkin: transaction.is_walkin || false
        };
      });

    return {
      stats,
      materialDistribution,
      revenueData,
      performanceMetrics,
      topSuppliers,
      recentTransactions
    };
  };

  // Set up real-time subscriptions
  useEffect(() => {
    // Initial fetch
    fetchDashboardData();

    // Set up real-time subscriptions for all relevant tables
    const transactionsChannel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          console.log('Transaction change detected, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    const suppliersChannel = supabase
      .channel('dashboard-suppliers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers' },
        () => {
          console.log('Supplier change detected, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    const materialsChannel = supabase
      .channel('dashboard-materials')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materials' },
        () => {
          console.log('Material change detected, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    // Set up periodic refresh (every 5 minutes)
    const refreshInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);

    // Cleanup
    return () => {
      console.log('Cleaning up dashboard subscriptions');
      transactionsChannel.unsubscribe();
      suppliersChannel.unsubscribe();
      materialsChannel.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  // Refetch function for manual refresh
  const refetch = async () => {
    await fetchDashboardData();
  };

  return {
    dashboardData,
    loading,
    error,
    refetch,
    lastUpdated
  };
};