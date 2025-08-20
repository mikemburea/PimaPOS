// src/components/reports/WeeklyReport.tsx - Updated with Sales Transaction Integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2, BarChart3, Target, ArrowUpRight, ArrowDownLeft, ShoppingCart } from 'lucide-react';

// Enhanced interfaces to handle both purchases and sales
interface PurchaseTransaction {
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

interface SalesTransaction {
  id: string;
  transaction_id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  material_id?: number | null;
  material_name: string;
  weight_kg: number;
  price_per_kg: number;
  total_amount: number;
  transaction_date: string;
  notes?: string | null;
  is_special_price?: boolean | null;
  original_price?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  transaction_type?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// Unified transaction interface
interface UnifiedTransaction {
  id: string;
  type: 'purchase' | 'sale';
  customer_name: string;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  weight_kg: number;
  price_per_kg: number;
  payment_method?: string | null;
  payment_status?: string | null;
  created_at: string;
  quality_grade?: string | null;
  notes?: string | null;
  transaction_reference: string;
}

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
}

interface WeeklyReportProps {
  weekStartDate?: Date;
}

interface DailyStats {
  day: string;
  date: string;
  purchases: number;
  sales: number;
  purchaseRevenue: number;
  salesRevenue: number;
  netProfit: number;
  weight: number;
}

interface MaterialPerformance {
  purchases: { transactions: number; weight: number; revenue: number };
  sales: { transactions: number; weight: number; revenue: number };
  netProfit: number;
  avgPurchasePrice: number;
  avgSalesPrice: number;
  margin: number;
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8 sm:py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-4" />
      <p className="text-gray-600 text-sm sm:text-base">Loading weekly report...</p>
    </div>
  </div>
);

// Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex items-center justify-center py-8 sm:py-12">
    <div className="text-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 sm:px-6 sm:py-4 rounded-lg max-w-lg">
        <div className="flex items-center justify-center mb-2">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <p className="font-bold text-sm sm:text-base">Error loading report</p>
        </div>
        <p className="text-xs sm:text-sm mb-3 sm:mb-4">{error}</p>
        <button 
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 sm:px-4 rounded transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

// Empty state component
const EmptyState = ({ weekRange }: { weekRange: string }) => (
  <div className="text-center py-8 sm:py-12">
    <div className="bg-gray-100 rounded-full p-4 sm:p-6 w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
      <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto" />
    </div>
    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Transactions This Week</h3>
    <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
      No transactions have been recorded for the week of {weekRange}
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
      <p className="text-xs sm:text-sm text-blue-800">
        Weekly statistics will appear here as transactions are recorded throughout the week.
      </p>
    </div>
  </div>
);

// Mobile-first stats card component
const WeeklyStatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  bgColor, 
  textColor, 
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ComponentType<any>; 
  bgColor: string; 
  textColor: string;
  trend?: { value: string; isPositive: boolean };
}) => (
  <div className={`${bgColor} p-3 sm:p-4 rounded-lg w-full`}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <h3 className={`text-xs sm:text-sm font-medium ${textColor} opacity-80`}>{title}</h3>
        <p className={`text-lg sm:text-2xl font-bold ${textColor} mt-1 truncate`}>{value}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className={`text-xs ${textColor} opacity-70`}>{subtitle}</p>
          {trend && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      </div>
      <div className="ml-2 shrink-0">
        <Icon size={20} className={`${textColor} sm:w-6 sm:h-6`} />
      </div>
    </div>
  </div>
);

const WeeklyReport: React.FC<WeeklyReportProps> = ({ weekStartDate = new Date() }) => {
  const [purchaseTransactions, setPurchaseTransactions] = useState<PurchaseTransaction[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [previousWeekPurchases, setPreviousWeekPurchases] = useState<PurchaseTransaction[]>([]);
  const [previousWeekSales, setPreviousWeekSales] = useState<SalesTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate week range
  const startOfWeek = new Date(weekStartDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Calculate previous week range for comparison
  const startOfPreviousWeek = new Date(startOfWeek);
  startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);
  
  const endOfPreviousWeek = new Date(startOfPreviousWeek);
  endOfPreviousWeek.setDate(endOfPreviousWeek.getDate() + 6);
  endOfPreviousWeek.setHours(23, 59, 59, 999);

  // Fetch data from Supabase
  const fetchWeeklyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format dates for SQL query
      const startDateStr = startOfWeek.toISOString().split('T')[0];
      const endDateStr = endOfWeek.toISOString().split('T')[0];
      const prevStartDateStr = startOfPreviousWeek.toISOString().split('T')[0];
      const prevEndDateStr = endOfPreviousWeek.toISOString().split('T')[0];

      // Fetch current week purchase transactions
      const { data: currentWeekPurchases, error: currentPurchasesError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', startDateStr)
        .lte('transaction_date', endDateStr)
        .order('created_at', { ascending: false });

      if (currentPurchasesError) {
        throw new Error(`Error fetching current week purchases: ${currentPurchasesError.message}`);
      }

      // Fetch current week sales transactions
      const { data: currentWeekSales, error: currentSalesError } = await supabase
        .from('sales_transactions')
        .select('*')
        .gte('transaction_date', startDateStr)
        .lte('transaction_date', endDateStr)
        .order('created_at', { ascending: false });

      if (currentSalesError) {
        throw new Error(`Error fetching current week sales: ${currentSalesError.message}`);
      }

      // Fetch previous week data for comparison
      const { data: previousPurchases, error: prevPurchasesError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', prevStartDateStr)
        .lte('transaction_date', prevEndDateStr)
        .order('created_at', { ascending: false });

      if (prevPurchasesError) {
        console.warn('Could not fetch previous week purchase data:', prevPurchasesError.message);
        setPreviousWeekPurchases([]);
      } else {
        setPreviousWeekPurchases(previousPurchases || []);
      }

      const { data: previousSales, error: prevSalesError } = await supabase
        .from('sales_transactions')
        .select('*')
        .gte('transaction_date', prevStartDateStr)
        .lte('transaction_date', prevEndDateStr)
        .order('created_at', { ascending: false });

      if (prevSalesError) {
        console.warn('Could not fetch previous week sales data:', prevSalesError.message);
        setPreviousWeekSales([]);
      } else {
        setPreviousWeekSales(previousSales || []);
      }

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      setPurchaseTransactions(currentWeekPurchases || []);
      setSalesTransactions(currentWeekSales || []);
      setSuppliers(suppliersData || []);

    } catch (err) {
      console.error('Error fetching weekly data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get supplier name
  const getSupplierName = (transaction: PurchaseTransaction): string => {
    if (transaction.is_walkin) {
      return transaction.walkin_name || 'Walk-in Customer';
    }
    
    const supplier = suppliers.find(s => s.id === transaction.supplier_id);
    return supplier?.name || 'Unknown Supplier';
  };

  // Transform data into unified format
  const unifiedTransactions: UnifiedTransaction[] = [
    ...purchaseTransactions.map(t => ({
      id: t.id,
      type: 'purchase' as const,
      customer_name: getSupplierName(t),
      material_type: t.material_type,
      transaction_date: t.transaction_date,
      total_amount: t.total_amount || 0,
      weight_kg: t.weight_kg || 0,
      price_per_kg: t.unit_price || 0,
      payment_method: t.payment_method,
      payment_status: t.payment_status,
      created_at: t.created_at,
      quality_grade: t.quality_grade,
      notes: t.notes,
      transaction_reference: t.transaction_number || t.id
    })),
    ...salesTransactions.map(t => ({
      id: t.id,
      type: 'sale' as const,
      customer_name: t.supplier_name || 'Unknown Customer',
      material_type: t.material_name,
      transaction_date: t.transaction_date,
      total_amount: t.total_amount || 0,
      weight_kg: t.weight_kg || 0,
      price_per_kg: t.price_per_kg || 0,
      payment_method: t.payment_method,
      payment_status: t.payment_status,
      created_at: t.created_at,
      notes: t.notes,
      transaction_reference: t.transaction_id || t.id
    }))
  ];

  // Filter transactions for the current week
  const weekTransactions = unifiedTransactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
  });

  // Separate purchases and sales
  const weekPurchases = weekTransactions.filter(t => t.type === 'purchase');
  const weekSales = weekTransactions.filter(t => t.type === 'sale');

  // Calculate weekly stats
  const purchaseRevenue = weekPurchases.reduce((sum, t) => sum + t.total_amount, 0);
  const salesRevenue = weekSales.reduce((sum, t) => sum + t.total_amount, 0);
  const netRevenue = salesRevenue - purchaseRevenue;
  const totalWeight = weekPurchases.reduce((sum, t) => sum + t.weight_kg, 0) + weekSales.reduce((sum, t) => sum + t.weight_kg, 0);
  
  const avgDailyPurchases = purchaseRevenue / 7;
  const avgDailySales = salesRevenue / 7;
  const avgDailyProfit = netRevenue / 7;
  const uniqueCustomers = new Set(weekTransactions.map(t => t.customer_name)).size;

  // Calculate previous week stats for comparison
  const previousPurchaseRevenue = previousWeekPurchases.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const previousSalesRevenue = previousWeekSales.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const previousNetRevenue = previousSalesRevenue - previousPurchaseRevenue;
  
  const revenueGrowth = previousSalesRevenue > 0 
    ? ((salesRevenue - previousSalesRevenue) / previousSalesRevenue * 100) 
    : salesRevenue > 0 ? 100 : 0;
    
  const profitGrowth = previousNetRevenue !== 0 
    ? ((netRevenue - previousNetRevenue) / Math.abs(previousNetRevenue) * 100)
    : netRevenue > 0 ? 100 : netRevenue < 0 ? -100 : 0;

  // Daily breakdown
  const dailyStats: DailyStats[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    
    const dayTransactions = weekTransactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate.toDateString() === day.toDateString();
    });

    const dayPurchases = dayTransactions.filter(t => t.type === 'purchase');
    const daySales = dayTransactions.filter(t => t.type === 'sale');
    
    const dayPurchaseRevenue = dayPurchases.reduce((sum, t) => sum + t.total_amount, 0);
    const daySalesRevenue = daySales.reduce((sum, t) => sum + t.total_amount, 0);

    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      date: day.toLocaleDateString(),
      purchases: dayPurchases.length,
      sales: daySales.length,
      purchaseRevenue: dayPurchaseRevenue,
      salesRevenue: daySalesRevenue,
      netProfit: daySalesRevenue - dayPurchaseRevenue,
      weight: dayTransactions.reduce((sum, t) => sum + t.weight_kg, 0)
    };
  });

  // Material performance
  const materialPerformance = weekTransactions.reduce((acc, t) => {
    const material = t.material_type;
    if (!acc[material]) {
      acc[material] = { 
        purchases: { transactions: 0, weight: 0, revenue: 0 },
        sales: { transactions: 0, weight: 0, revenue: 0 },
        netProfit: 0,
        avgPurchasePrice: 0,
        avgSalesPrice: 0,
        margin: 0
      };
    }
    
    if (t.type === 'purchase') {
      acc[material].purchases.transactions++;
      acc[material].purchases.weight += t.weight_kg;
      acc[material].purchases.revenue += t.total_amount;
    } else {
      acc[material].sales.transactions++;
      acc[material].sales.weight += t.weight_kg;
      acc[material].sales.revenue += t.total_amount;
    }
    
    // Calculate derived values
    acc[material].netProfit = acc[material].sales.revenue - acc[material].purchases.revenue;
    acc[material].avgPurchasePrice = acc[material].purchases.weight > 0 ? acc[material].purchases.revenue / acc[material].purchases.weight : 0;
    acc[material].avgSalesPrice = acc[material].sales.weight > 0 ? acc[material].sales.revenue / acc[material].sales.weight : 0;
    acc[material].margin = acc[material].sales.revenue > 0 ? (acc[material].netProfit / acc[material].sales.revenue) * 100 : 0;
    
    return acc;
  }, {} as Record<string, MaterialPerformance>);

  // Top performing days
  const topProfitableDay = dailyStats.reduce((prev, current) => 
    prev.netProfit > current.netProfit ? prev : current
  );

  // Customer performance this week
  const customerPerformance = weekTransactions.reduce((acc, t) => {
    const customerName = t.customer_name;
    if (!acc[customerName]) {
      acc[customerName] = { 
        purchases: 0, 
        sales: 0, 
        purchaseRevenue: 0, 
        salesRevenue: 0, 
        weight: 0,
        netValue: 0
      };
    }
    
    if (t.type === 'purchase') {
      acc[customerName].purchases++;
      acc[customerName].purchaseRevenue += t.total_amount;
    } else {
      acc[customerName].sales++;
      acc[customerName].salesRevenue += t.total_amount;
    }
    acc[customerName].weight += t.weight_kg;
    acc[customerName].netValue = acc[customerName].salesRevenue - acc[customerName].purchaseRevenue;
    
    return acc;
  }, {} as Record<string, { purchases: number; sales: number; purchaseRevenue: number; salesRevenue: number; weight: number; netValue: number }>);

  const topCustomers = Object.entries(customerPerformance)
    .sort(([, a], [, b]) => (b.purchaseRevenue + b.salesRevenue) - (a.purchaseRevenue + a.salesRevenue))
    .slice(0, 5);

  // Load data on component mount and when week changes
  useEffect(() => {
    fetchWeeklyData();
  }, [weekStartDate]);

  // Setup real-time subscription for this week's transactions
  useEffect(() => {
    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];
    
    const purchaseChannel = supabase
      .channel('weekly-purchases')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `transaction_date=gte.${startDateStr},transaction_date=lte.${endDateStr}`
        },
        (payload) => {
          const newTransaction = payload.new as PurchaseTransaction;
          const transactionDate = new Date(newTransaction.transaction_date);
          
          if (transactionDate >= startOfWeek && transactionDate <= endOfWeek) {
            setPurchaseTransactions(current => [newTransaction, ...current]);
          }
        }
      )
      .subscribe();

    const salesChannel = supabase
      .channel('weekly-sales')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_transactions',
          filter: `transaction_date=gte.${startDateStr},transaction_date=lte.${endDateStr}`
        },
        (payload) => {
          const newTransaction = payload.new as SalesTransaction;
          const transactionDate = new Date(newTransaction.transaction_date);
          
          if (transactionDate >= startOfWeek && transactionDate <= endOfWeek) {
            setSalesTransactions(current => [newTransaction, ...current]);
          }
        }
      )
      .subscribe();

    return () => {
      purchaseChannel.unsubscribe();
      salesChannel.unsubscribe();
    };
  }, [startOfWeek, endOfWeek]);

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <ErrorDisplay error={error} onRetry={fetchWeeklyData} />
        </div>
      </div>
    );
  }

  const weekRange = `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Weekly Report</h2>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={16} className="sm:w-5 sm:h-5" />
            <p className="text-sm sm:text-base">{weekRange}</p>
          </div>
        </div>

        {weekTransactions.length === 0 ? (
          <EmptyState weekRange={weekRange} />
        ) : (
          <>
            {/* Summary Cards - Mobile First Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <WeeklyStatsCard 
                title="Purchases" 
                value={weekPurchases.length.toString()} 
                subtitle="Transactions"
                icon={ArrowDownLeft}
                bgColor="bg-blue-50"
                textColor="text-blue-900"
                trend={{ value: `${revenueGrowth.toFixed(1)}%`, isPositive: revenueGrowth >= 0 }}
              />
              <WeeklyStatsCard 
                title="Sales" 
                value={weekSales.length.toString()} 
                subtitle="Transactions"
                icon={ArrowUpRight}
                bgColor="bg-green-50"
                textColor="text-green-900"
              />
              <WeeklyStatsCard 
                title="Purchase Cost" 
                value={`${purchaseRevenue.toLocaleString()}`} 
                subtitle="KES spent"
                icon={DollarSign}
                bgColor="bg-red-50"
                textColor="text-red-900"
              />
              <WeeklyStatsCard 
                title="Sales Revenue" 
                value={`${salesRevenue.toLocaleString()}`} 
                subtitle="KES earned"
                icon={DollarSign}
                bgColor="bg-green-50"
                textColor="text-green-900"
                trend={{ value: `${revenueGrowth.toFixed(1)}%`, isPositive: revenueGrowth >= 0 }}
              />
              <WeeklyStatsCard 
                title="Net Profit" 
                value={`${netRevenue.toLocaleString()}`} 
                subtitle={netRevenue >= 0 ? "Profit" : "Loss"}
                icon={TrendingUp}
                bgColor={netRevenue >= 0 ? "bg-emerald-50" : "bg-red-50"}
                textColor={netRevenue >= 0 ? "text-emerald-900" : "text-red-900"}
                trend={{ value: `${Math.abs(profitGrowth).toFixed(1)}%`, isPositive: profitGrowth >= 0 }}
              />
              <WeeklyStatsCard 
                title="Active Partners" 
                value={uniqueCustomers.toString()} 
                subtitle="Unique customers"
                icon={Users}
                bgColor="bg-indigo-50"
                textColor="text-indigo-900"
              />
            </div>

            {/* Weekly Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Purchase Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-medium text-red-700">KES {purchaseRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Daily Average:</span>
                    <span className="font-medium">KES {avgDailyPurchases.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Transactions:</span>
                    <span className="font-medium">{weekPurchases.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Sales Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="font-medium text-green-700">KES {salesRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Daily Average:</span>
                    <span className="font-medium">KES {avgDailySales.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Transactions:</span>
                    <span className="font-medium">{weekSales.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Profit Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Net Profit:</span>
                    <span className={`font-medium ${netRevenue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      KES {netRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Daily Average:</span>
                    <span className="font-medium">KES {avgDailyProfit.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className="font-medium">
                      {salesRevenue > 0 ? ((netRevenue / salesRevenue) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Daily Trend</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Profit</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailyStats.map((day, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${day.purchases === 0 && day.sales === 0 ? 'bg-gray-50' : ''}`}>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                          <div>
                            <div>{day.day}</div>
                            <div className="text-xs text-gray-500">{day.date}</div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                          <div>
                            <div>{day.purchases} tx</div>
                            <div className="text-red-600 font-medium">KES {day.purchaseRevenue.toLocaleString()}</div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                          <div>
                            <div>{day.sales} tx</div>
                            <div className="text-green-600 font-medium">KES {day.salesRevenue.toLocaleString()}</div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <div className={`font-medium ${day.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {day.netProfit >= 0 ? '+' : ''}KES {day.netProfit.toLocaleString()}
                            {day.day === topProfitableDay.day && day.netProfit > 0 && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Best Day
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{day.weight.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">Total</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                        <div>
                          <div>{weekPurchases.length} tx</div>
                          <div className="text-red-600">KES {purchaseRevenue.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                        <div>
                          <div>{weekSales.length} tx</div>
                          <div className="text-green-600">KES {salesRevenue.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">
                        <div className={netRevenue >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {netRevenue >= 0 ? '+' : ''}KES {netRevenue.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{totalWeight.toFixed(1)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Material Performance */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Material Performance</h3>
              {Object.keys(materialPerformance).length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">No materials processed this week</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(materialPerformance)
                    .sort(([, a], [, b]) => b.netProfit - a.netProfit)
                    .map(([material, stats]) => (
                      <div key={material} className="bg-gray-50 p-3 sm:p-4 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-gray-900">{material}</h4>
                          <span className={`text-sm font-bold px-2 py-1 rounded ${stats.netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {stats.netProfit >= 0 ? '+' : ''}KES {stats.netProfit.toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 text-xs">Purchases</div>
                            <div className="font-medium">{stats.purchases.transactions} tx • {stats.purchases.weight.toFixed(1)} kg</div>
                            <div className="text-red-600">KES {stats.purchases.revenue.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-600 text-xs">Sales</div>
                            <div className="font-medium">{stats.sales.transactions} tx • {stats.sales.weight.toFixed(1)} kg</div>
                            <div className="text-green-600">KES {stats.sales.revenue.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
                          <span className="text-gray-600">Margin: {stats.margin.toFixed(1)}%</span>
                          <span className="text-gray-600">
                            Spread: KES {(stats.avgSalesPrice - stats.avgPurchasePrice).toFixed(2)}/kg
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Top Partners This Week */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Top Partners This Week</h3>
              {topCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">No customer data available</p>
              ) : (
                <div className="space-y-2">
                  {topCustomers.map(([customer, stats], index) => (
                    <div key={customer} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-medium shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate block">{customer}</span>
                          <p className="text-xs text-gray-500 truncate">
                            {stats.weight.toFixed(1)} kg • {stats.purchases + stats.sales} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="flex flex-col gap-1">
                          {stats.purchases > 0 && (
                            <span className="text-xs text-red-600">-KES {stats.purchaseRevenue.toLocaleString()}</span>
                          )}
                          {stats.sales > 0 && (
                            <span className="text-xs text-green-600">+KES {stats.salesRevenue.toLocaleString()}</span>
                          )}
                        </div>
                        <p className={`text-xs font-medium ${stats.netValue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          Net: {stats.netValue >= 0 ? '+' : ''}KES {stats.netValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm sm:text-lg font-semibold text-blue-900 mb-2">Weekly Insights</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                    <li>• Net profit: KES {netRevenue.toLocaleString()} ({profitGrowth >= 0 ? '+' : ''}{profitGrowth.toFixed(1)}% vs last week)</li>
                    <li>• Revenue {revenueGrowth >= 0 ? 'increased' : 'decreased'} by {Math.abs(revenueGrowth).toFixed(1)}%</li>
                    <li>• Most profitable material: {Object.entries(materialPerformance).sort(([,a], [,b]) => b.netProfit - a.netProfit)[0]?.[0] || 'N/A'}</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                    <li>• {uniqueCustomers} unique partners active this week</li>
                    <li>• Best day: {topProfitableDay.day} (KES {topProfitableDay.netProfit.toLocaleString()} profit)</li>
                    <li>• Average transaction: KES {weekTransactions.length > 0 ? ((purchaseRevenue + salesRevenue) / weekTransactions.length).toFixed(0) : '0'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeeklyReport;