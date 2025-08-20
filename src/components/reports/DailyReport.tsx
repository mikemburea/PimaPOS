// src/components/reports/DailyReport.tsx - Updated with Sales Transaction Integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2, ShoppingCart, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

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

interface DailyReportProps {
  currentDate?: Date;
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8 sm:py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-4" />
      <p className="text-gray-600 text-sm sm:text-base">Loading daily report...</p>
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
const EmptyState = ({ currentDate }: { currentDate: Date }) => (
  <div className="text-center py-8 sm:py-12">
    <div className="bg-gray-100 rounded-full p-4 sm:p-6 w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
      <Package className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto" />
    </div>
    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Transactions Today</h3>
    <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
      No transactions have been recorded for {currentDate.toLocaleDateString()}
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
      <p className="text-xs sm:text-sm text-blue-800">
        Transactions will appear here as they are recorded throughout the day.
      </p>
    </div>
  </div>
);

// Mobile-first stats card component
const MobileStatsCard = ({ 
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

const DailyReport: React.FC<DailyReportProps> = ({ currentDate = new Date() }) => {
  const [purchaseTransactions, setPurchaseTransactions] = useState<PurchaseTransaction[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Fetch data from Supabase
  const fetchDailyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the date string for filtering (YYYY-MM-DD format)
      const dateString = currentDate.toISOString().split('T')[0];
      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      console.log('Fetching data for date:', dateString);
      console.log('Today start:', today.toISOString());
      console.log('Tomorrow start:', tomorrow.toISOString());
      
      // Fetch ALL purchase transactions first (for debugging)
      const { data: allPurchaseData, error: allPurchaseError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (allPurchaseError) {
        console.error('Error fetching all purchases:', allPurchaseError);
      } else {
        console.log('All purchase transactions:', allPurchaseData?.length || 0);
        console.log('Sample purchase data:', allPurchaseData?.[0]);
      }

      // Fetch ALL sales transactions first (for debugging)
      const { data: allSalesData, error: allSalesError } = await supabase
        .from('sales_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (allSalesError) {
        console.error('Error fetching all sales:', allSalesError);
      } else {
        console.log('All sales transactions:', allSalesData?.length || 0);
        console.log('Sample sales data:', allSalesData?.[0]);
      }

      // If showing all transactions (debug mode), don't filter by date
      const purchaseData = showAllTransactions ? (allPurchaseData || []) : allPurchaseData?.filter(tx => {
        // Check both transaction_date and created_at
        const txDate = new Date(tx.transaction_date || tx.created_at);
        const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        const matches = txDateOnly.getTime() === currentDateOnly.getTime();
        if (matches) {
          console.log('Matching purchase transaction:', {
            id: tx.id,
            transaction_date: tx.transaction_date,
            created_at: tx.created_at,
            material_type: tx.material_type,
            total_amount: tx.total_amount
          });
        }
        return matches;
      }) || [];

      const salesData = showAllTransactions ? (allSalesData || []) : allSalesData?.filter(tx => {
        // Check both transaction_date and created_at
        const txDate = new Date(tx.transaction_date || tx.created_at);
        const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        const matches = txDateOnly.getTime() === currentDateOnly.getTime();
        if (matches) {
          console.log('Matching sales transaction:', {
            id: tx.id,
            transaction_date: tx.transaction_date,
            created_at: tx.created_at,
            material_name: tx.material_name,
            total_amount: tx.total_amount
          });
        }
        return matches;
      }) || [];

      console.log('Filtered purchase transactions for today:', purchaseData.length);
      console.log('Filtered sales transactions for today:', salesData.length);

      // Fetch suppliers (for supplier name lookup)
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        console.warn('Error fetching suppliers:', suppliersError.message);
        setSuppliers([]);
      } else {
        setSuppliers(suppliersData || []);
      }

      setPurchaseTransactions(purchaseData);
      setSalesTransactions(salesData);

    } catch (err) {
      console.error('Error fetching daily data:', err);
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

  console.log('Unified transactions:', unifiedTransactions.length);
  console.log('Sample unified transaction:', unifiedTransactions[0]);

  // All transactions are already filtered by date in fetchDailyData
  const todayTransactions = unifiedTransactions;

  // Separate purchases and sales
  const todayPurchases = todayTransactions.filter(t => t.type === 'purchase');
  const todaySales = todayTransactions.filter(t => t.type === 'sale');

  console.log('Today purchases:', todayPurchases.length);
  console.log('Today sales:', todaySales.length);

  // Calculate daily stats
  const purchaseRevenue = todayPurchases.reduce((sum, t) => sum + t.total_amount, 0);
  const salesRevenue = todaySales.reduce((sum, t) => sum + t.total_amount, 0);
  const netRevenue = salesRevenue - purchaseRevenue;
  
  const purchaseWeight = todayPurchases.reduce((sum, t) => sum + t.weight_kg, 0);
  const salesWeight = todaySales.reduce((sum, t) => sum + t.weight_kg, 0);
  
  const avgPurchasePrice = purchaseWeight > 0 ? purchaseRevenue / purchaseWeight : 0;
  const avgSalesPrice = salesWeight > 0 ? salesRevenue / salesWeight : 0;

  // Material breakdown for both purchases and sales
  const materialBreakdown = todayTransactions.reduce((acc, t) => {
    const material = t.material_type;
    if (!acc[material]) {
      acc[material] = { 
        purchases: { count: 0, weight: 0, revenue: 0 },
        sales: { count: 0, weight: 0, revenue: 0 }
      };
    }
    
    if (t.type === 'purchase') {
      acc[material].purchases.count++;
      acc[material].purchases.weight += t.weight_kg;
      acc[material].purchases.revenue += t.total_amount;
    } else {
      acc[material].sales.count++;
      acc[material].sales.weight += t.weight_kg;
      acc[material].sales.revenue += t.total_amount;
    }
    
    return acc;
  }, {} as Record<string, { 
    purchases: { count: number; weight: number; revenue: number };
    sales: { count: number; weight: number; revenue: number };
  }>);

  // Top customers/suppliers analysis
  const customerStats = todayTransactions.reduce((acc, t) => {
    const name = t.customer_name;
    
    if (!acc[name]) {
      acc[name] = { purchases: 0, sales: 0, purchaseRevenue: 0, salesRevenue: 0, weight: 0 };
    }
    
    if (t.type === 'purchase') {
      acc[name].purchases++;
      acc[name].purchaseRevenue += t.total_amount;
    } else {
      acc[name].sales++;
      acc[name].salesRevenue += t.total_amount;
    }
    acc[name].weight += t.weight_kg;
    
    return acc;
  }, {} as Record<string, { purchases: number; sales: number; purchaseRevenue: number; salesRevenue: number; weight: number }>);

  const topCustomers = Object.entries(customerStats)
    .sort(([, a], [, b]) => (b.purchaseRevenue + b.salesRevenue) - (a.purchaseRevenue + a.salesRevenue))
    .slice(0, 5);

  // Payment method breakdown
  const paymentMethodStats = todayTransactions.reduce((acc, t) => {
    const method = t.payment_method || 'cash';
    if (!acc[method]) {
      acc[method] = { purchases: 0, sales: 0, purchaseAmount: 0, salesAmount: 0 };
    }
    
    if (t.type === 'purchase') {
      acc[method].purchases++;
      acc[method].purchaseAmount += t.total_amount;
    } else {
      acc[method].sales++;
      acc[method].salesAmount += t.total_amount;
    }
    
    return acc;
  }, {} as Record<string, { purchases: number; sales: number; purchaseAmount: number; salesAmount: number }>);

  // Hourly distribution
  const hourlyStats = todayTransactions.reduce((acc, t) => {
    const hour = new Date(t.created_at).getHours();
    const hourKey = `${hour}:00`;
    
    if (!acc[hourKey]) {
      acc[hourKey] = { purchases: 0, sales: 0, purchaseRevenue: 0, salesRevenue: 0 };
    }
    
    if (t.type === 'purchase') {
      acc[hourKey].purchases++;
      acc[hourKey].purchaseRevenue += t.total_amount;
    } else {
      acc[hourKey].sales++;
      acc[hourKey].salesRevenue += t.total_amount;
    }
    
    return acc;
  }, {} as Record<string, { purchases: number; sales: number; purchaseRevenue: number; salesRevenue: number }>);

  // Get peak hour
  const peakHour = Object.entries(hourlyStats)
    .sort(([, a], [, b]) => (b.purchases + b.sales) - (a.purchases + a.sales))[0];

  // Load data on component mount and when date changes
  useEffect(() => {
    fetchDailyData();
  }, [currentDate, showAllTransactions]);

  // Setup real-time subscription for today's transactions
  useEffect(() => {
    const dateString = currentDate.toISOString().split('T')[0];
    
    const purchaseChannel = supabase
      .channel('daily-purchases')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `transaction_date=gte.${dateString}`
        },
        (payload) => {
          const newTransaction = payload.new as PurchaseTransaction;
          const transactionDate = new Date(newTransaction.transaction_date);
          
          if (transactionDate.toDateString() === currentDate.toDateString()) {
            setPurchaseTransactions(current => [newTransaction, ...current]);
          }
        }
      )
      .subscribe();

    const salesChannel = supabase
      .channel('daily-sales')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_transactions',
          filter: `transaction_date=gte.${dateString}`
        },
        (payload) => {
          const newTransaction = payload.new as SalesTransaction;
          const transactionDate = new Date(newTransaction.transaction_date);
          
          if (transactionDate.toDateString() === currentDate.toDateString()) {
            setSalesTransactions(current => [newTransaction, ...current]);
          }
        }
      )
      .subscribe();

    return () => {
      purchaseChannel.unsubscribe();
      salesChannel.unsubscribe();
    };
  }, [currentDate]);

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
          <ErrorDisplay error={error} onRetry={fetchDailyData} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Daily Report</h2>
          <div className="flex items-center gap-2 sm:gap-4 text-gray-600">
            {/* Debug Toggle Button */}
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              {showAllTransactions ? 'Show Today Only' : 'Show All Transactions'}
            </button>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="sm:w-5 sm:h-5" />
              <p className="text-sm sm:text-base">
                {showAllTransactions ? 'All Transactions' : currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Debug Info - Shows in all environments for troubleshooting */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Debug Info</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>Mode: {showAllTransactions ? 'All Transactions' : 'Today Only'}</p>
            <p>Date being queried: {currentDate.toISOString().split('T')[0]}</p>
            <p>Purchase transactions fetched: {purchaseTransactions.length}</p>
            <p>Sales transactions fetched: {salesTransactions.length}</p>
            <p>Unified transactions: {unifiedTransactions.length}</p>
            <p>Today's transactions: {todayTransactions.length}</p>
            {purchaseTransactions.length > 0 && (
              <p>Sample purchase date: {purchaseTransactions[0]?.transaction_date || purchaseTransactions[0]?.created_at}</p>
            )}
            {salesTransactions.length > 0 && (
              <p>Sample sales date: {salesTransactions[0]?.transaction_date || salesTransactions[0]?.created_at}</p>
            )}
          </div>
        </div>

        {todayTransactions.length === 0 ? (
          <EmptyState currentDate={currentDate} />
        ) : (
          <>
            {/* Summary Cards - Mobile First Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <MobileStatsCard 
                title="Purchases" 
                value={todayPurchases.length.toString()} 
                subtitle="Transactions"
                icon={ArrowDownLeft}
                bgColor="bg-blue-50"
                textColor="text-blue-900"
              />
              <MobileStatsCard 
                title="Sales" 
                value={todaySales.length.toString()} 
                subtitle="Transactions"
                icon={ArrowUpRight}
                bgColor="bg-green-50"
                textColor="text-green-900"
              />
              <MobileStatsCard 
                title="Purchase Cost" 
                value={`${purchaseRevenue.toLocaleString()}`} 
                subtitle="KES spent"
                icon={DollarSign}
                bgColor="bg-red-50"
                textColor="text-red-900"
              />
              <MobileStatsCard 
                title="Sales Revenue" 
                value={`${salesRevenue.toLocaleString()}`} 
                subtitle="KES earned"
                icon={DollarSign}
                bgColor="bg-green-50"
                textColor="text-green-900"
              />
              <MobileStatsCard 
                title="Net Profit" 
                value={`${netRevenue.toLocaleString()}`} 
                subtitle={netRevenue >= 0 ? "Profit" : "Loss"}
                icon={TrendingUp}
                bgColor={netRevenue >= 0 ? "bg-emerald-50" : "bg-red-50"}
                textColor={netRevenue >= 0 ? "text-emerald-900" : "text-red-900"}
              />
              <MobileStatsCard 
                title="Total Weight" 
                value={`${(purchaseWeight + salesWeight).toFixed(1)}`} 
                subtitle="kg processed"
                icon={Package}
                bgColor="bg-purple-50"
                textColor="text-purple-900"
              />
            </div>

            {/* Transaction Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Purchase Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-medium text-red-700">KES {purchaseRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Weight Bought:</span>
                    <span className="font-medium">{purchaseWeight.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Avg Price:</span>
                    <span className="font-medium">KES {avgPurchasePrice.toFixed(2)}/kg</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Sales Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="font-medium text-green-700">KES {salesRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Weight Sold:</span>
                    <span className="font-medium">{salesWeight.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Avg Price:</span>
                    <span className="font-medium">KES {avgSalesPrice.toFixed(2)}/kg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Material Breakdown */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Material Breakdown</h3>
              {Object.keys(materialBreakdown).length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">No materials processed today</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Net P&L</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(materialBreakdown)
                        .sort(([,a], [,b]) => (b.sales.revenue - b.purchases.revenue) - (a.sales.revenue - a.purchases.revenue))
                        .map(([material, stats]) => {
                          const netPL = stats.sales.revenue - stats.purchases.revenue;
                          return (
                            <tr key={material} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{material}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                                <div>
                                  <div>{stats.purchases.count} tx • {stats.purchases.weight.toFixed(1)} kg</div>
                                  <div className="text-red-600 font-medium">KES {stats.purchases.revenue.toLocaleString()}</div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                                <div>
                                  <div>{stats.sales.count} tx • {stats.sales.weight.toFixed(1)} kg</div>
                                  <div className="text-green-600 font-medium">KES {stats.sales.revenue.toLocaleString()}</div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                <div className={`font-medium ${netPL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {netPL >= 0 ? '+' : ''}KES {netPL.toLocaleString()}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Customers/Suppliers */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Top Partners Today</h3>
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
                          <p className="text-xs text-gray-500 truncate">{stats.weight.toFixed(1)} kg • {stats.purchases + stats.sales} transactions</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-right shrink-0 ml-2">
                        {stats.purchases > 0 && (
                          <span className="text-xs text-red-600">-KES {stats.purchaseRevenue.toLocaleString()}</span>
                        )}
                        {stats.sales > 0 && (
                          <span className="text-xs text-green-600">+KES {stats.salesRevenue.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Payment Methods */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">Payment Methods</h4>
                <div className="space-y-2">
                  {Object.entries(paymentMethodStats).map(([method, stats]) => (
                    <div key={method} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 capitalize">{method.replace('_', ' ')}</span>
                      <div className="text-right">
                        <div className="flex gap-2">
                          {stats.purchases > 0 && (
                            <span className="text-red-600">P: {stats.purchases}</span>
                          )}
                          {stats.sales > 0 && (
                            <span className="text-green-600">S: {stats.sales}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">KES {(stats.purchaseAmount + stats.salesAmount).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Metrics */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">Business Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className="font-medium">
                      {salesRevenue > 0 ? ((netRevenue / salesRevenue) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Inventory Turnover:</span>
                    <span className="font-medium">{salesWeight > 0 && purchaseWeight > 0 ? (salesWeight / purchaseWeight * 100).toFixed(1) : '0'}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Avg Transaction:</span>
                    <span className="font-medium">KES {todayTransactions.length > 0 ? ((purchaseRevenue + salesRevenue) / todayTransactions.length).toFixed(0) : '0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm sm:text-lg font-semibold text-blue-900 mb-2">Daily Insights</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                    <li>• Net profit: KES {netRevenue.toLocaleString()} ({netRevenue >= 0 ? 'profitable' : 'loss'} day)</li>
                    <li>• {todayPurchases.length} purchases • {todaySales.length} sales</li>
                    <li>• Most traded: {Object.entries(materialBreakdown).sort(([,a], [,b]) => (b.purchases.count + b.sales.count) - (a.purchases.count + a.sales.count))[0]?.[0] || 'None'}</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                    <li>• Active partners: {Object.keys(customerStats).length}</li>
                    <li>• Peak hour: {peakHour ? peakHour[0] : 'N/A'}</li>
                    <li>• Price spread: KES {Math.abs(avgSalesPrice - avgPurchasePrice).toFixed(2)}/kg</li>
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

export default DailyReport;