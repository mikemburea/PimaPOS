// src/components/reports/MonthlyReport.tsx - Complete Supabase integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2, BarChart3, Target, Award, TrendingDown } from 'lucide-react';

// Define interfaces matching your database structure
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

interface MonthlyReportProps {
  month?: Date;
}

interface WeeklyBreakdown {
  week: string;
  period: string;
  transactions: number;
  revenue: number;
  weight: number;
}

interface MaterialAnalysis {
  transactions: number;
  weight: number;
  revenue: number;
  suppliers: Set<string>;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  supplierCount: number;
}

interface SupplierPerformance {
  name: string;
  transactions: number;
  revenue: number;
  weight: number;
  materials: Set<string>;
  materialCount: number;
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading monthly report...</p>
    </div>
  </div>
);

// Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg">
        <div className="flex items-center justify-center mb-2">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p className="font-bold">Error loading report</p>
        </div>
        <p className="text-sm mb-4">{error}</p>
        <button 
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

// Empty state component
const EmptyState = ({ monthName }: { monthName: string }) => (
  <div className="text-center py-12">
    <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4">
      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions This Month</h3>
    <p className="text-gray-600 mb-6">
      No transactions have been recorded for {monthName}
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
      <p className="text-sm text-blue-800">
        Monthly statistics will appear here as transactions are recorded throughout the month.
      </p>
    </div>
  </div>
);

const MonthlyReport: React.FC<MonthlyReportProps> = ({ month = new Date() }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [previousMonthTransactions, setPreviousMonthTransactions] = useState<Transaction[]>([]);
  const [previousYearTransactions, setPreviousYearTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate month range
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate previous month range for comparison
  const startOfPreviousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(month.getFullYear(), month.getMonth(), 0, 23, 59, 59, 999);

  // Calculate same month previous year for YoY comparison
  const startOfPreviousYear = new Date(month.getFullYear() - 1, month.getMonth(), 1);
  const endOfPreviousYear = new Date(month.getFullYear() - 1, month.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch data from Supabase
  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format dates for SQL query
      const startDateStr = startOfMonth.toISOString().split('T')[0];
      const endDateStr = endOfMonth.toISOString().split('T')[0];
      const prevStartDateStr = startOfPreviousMonth.toISOString().split('T')[0];
      const prevEndDateStr = endOfPreviousMonth.toISOString().split('T')[0];
      const prevYearStartStr = startOfPreviousYear.toISOString().split('T')[0];
      const prevYearEndStr = endOfPreviousYear.toISOString().split('T')[0];

      // Fetch current month transactions
      const { data: currentMonthData, error: currentMonthError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', startDateStr)
        .lte('transaction_date', endDateStr)
        .order('created_at', { ascending: false });

      if (currentMonthError) {
        throw new Error(`Error fetching current month transactions: ${currentMonthError.message}`);
      }

      // Fetch previous month transactions for comparison
      const { data: previousMonthData, error: previousMonthError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', prevStartDateStr)
        .lte('transaction_date', prevEndDateStr)
        .order('created_at', { ascending: false });

      if (previousMonthError) {
        console.warn('Could not fetch previous month data:', previousMonthError.message);
        setPreviousMonthTransactions([]);
      } else {
        setPreviousMonthTransactions(previousMonthData || []);
      }

      // Fetch previous year same month transactions for YoY comparison
      const { data: previousYearData, error: previousYearError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', prevYearStartStr)
        .lte('transaction_date', prevYearEndStr)
        .order('created_at', { ascending: false });

      if (previousYearError) {
        console.warn('Could not fetch previous year data:', previousYearError.message);
        setPreviousYearTransactions([]);
      } else {
        setPreviousYearTransactions(previousYearData || []);
      }

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      setTransactions(currentMonthData || []);
      setSuppliers(suppliersData || []);

    } catch (err) {
      console.error('Error fetching monthly data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions for the current month
  const monthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
  });

  // Calculate monthly stats
  const totalRevenue = monthTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const totalWeight = monthTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
  const avgTransactionValue = monthTransactions.length > 0 ? totalRevenue / monthTransactions.length : 0;
  const uniqueSuppliers = new Set(monthTransactions.map(t => t.supplier_id || t.walkin_name || 'unknown')).size;

  // Calculate days in month for daily average
  const daysInMonth = endOfMonth.getDate();
  const dailyAverage = monthTransactions.length / daysInMonth;

  // Calculate previous month stats for comparison
  const previousMonthRevenue = previousMonthTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const monthOverMonthGrowth = previousMonthRevenue > 0 
    ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue * 100) 
    : totalRevenue > 0 ? 100 : 0;

  // Calculate YoY comparison
  const previousYearRevenue = previousYearTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const yoyGrowth = previousYearRevenue > 0 
    ? ((totalRevenue - previousYearRevenue) / previousYearRevenue * 100) 
    : totalRevenue > 0 ? 100 : 0;

  // Get supplier name helper function
  const getSupplierName = (transaction: Transaction): string => {
    if (transaction.is_walkin) {
      return transaction.walkin_name || 'Walk-in Customer';
    }
    
    const supplier = suppliers.find(s => s.id === transaction.supplier_id);
    return supplier?.name || 'Unknown Supplier';
  };

  // Weekly breakdown
  const weeklyBreakdown: WeeklyBreakdown[] = [];
  let weekStart = new Date(startOfMonth);
  
  while (weekStart <= endOfMonth) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const actualWeekEnd = weekEnd > endOfMonth ? endOfMonth : weekEnd;
    
    const weekTransactions = monthTransactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate >= weekStart && transactionDate <= actualWeekEnd;
    });

    weeklyBreakdown.push({
      week: `Week ${weeklyBreakdown.length + 1}`,
      period: `${weekStart.toLocaleDateString()} - ${actualWeekEnd.toLocaleDateString()}`,
      transactions: weekTransactions.length,
      revenue: weekTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0),
      weight: weekTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0)
    });

    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  // Material analysis
  const materialAnalysis = monthTransactions.reduce((acc, t) => {
    const material = t.material_type;
    if (!acc[material]) {
      acc[material] = {
        transactions: 0,
        weight: 0,
        revenue: 0,
        suppliers: new Set<string>(),
        minPrice: Infinity,
        maxPrice: 0,
        avgPrice: 0,
        supplierCount: 0
      };
    }
    
    const weight = t.weight_kg || 0;
    const amount = t.total_amount || 0;
    const pricePerKg = weight > 0 ? amount / weight : 0;
    
    acc[material].transactions++;
    acc[material].weight += weight;
    acc[material].revenue += amount;
    acc[material].suppliers.add(t.supplier_id || t.walkin_name || 'unknown');
    
    if (pricePerKg > 0) {
      acc[material].minPrice = Math.min(acc[material].minPrice, pricePerKg);
      acc[material].maxPrice = Math.max(acc[material].maxPrice, pricePerKg);
    }
    
    return acc;
  }, {} as Record<string, MaterialAnalysis>);

  // Calculate average prices and supplier counts
  Object.keys(materialAnalysis).forEach(material => {
    const analysis = materialAnalysis[material];
    analysis.avgPrice = analysis.weight > 0 ? analysis.revenue / analysis.weight : 0;
    analysis.supplierCount = analysis.suppliers.size;
    
    // Handle case where no valid prices were found
    if (analysis.minPrice === Infinity) {
      analysis.minPrice = 0;
    }
  });

  // Top performing suppliers
  const supplierPerformance = monthTransactions.reduce((acc, t) => {
    const supplierName = getSupplierName(t);
    
    if (!acc[supplierName]) {
      acc[supplierName] = {
        name: supplierName,
        transactions: 0,
        revenue: 0,
        weight: 0,
        materials: new Set<string>(),
        materialCount: 0
      };
    }
    
    acc[supplierName].transactions++;
    acc[supplierName].revenue += t.total_amount || 0;
    acc[supplierName].weight += t.weight_kg || 0;
    acc[supplierName].materials.add(t.material_type);
    
    return acc;
  }, {} as Record<string, SupplierPerformance>);

  const topSuppliers = Object.values(supplierPerformance)
    .map(supplier => ({
      ...supplier,
      materialCount: supplier.materials.size
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Find best performing week
  const bestWeek = weeklyBreakdown.reduce((prev, current) => 
    prev.revenue > current.revenue ? prev : current
  );

  // Load data on component mount and when month changes
  useEffect(() => {
    fetchMonthlyData();
  }, [month]);

  // Setup real-time subscription for this month's transactions
  useEffect(() => {
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];
    
    const channel = supabase
      .channel('monthly-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `transaction_date=gte.${startDateStr},transaction_date=lte.${endDateStr}`
        },
        (payload) => {
          const newTransaction = payload.new as Transaction;
          const transactionDate = new Date(newTransaction.transaction_date);
          
          // Only add if it's within this month
          if (transactionDate >= startOfMonth && transactionDate <= endOfMonth) {
            setTransactions(current => [newTransaction, ...current]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `transaction_date=gte.${startDateStr},transaction_date=lte.${endDateStr}`
        },
        (payload) => {
          const updatedTransaction = payload.new as Transaction;
          setTransactions(current =>
            current.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [startOfMonth, endOfMonth]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <ErrorDisplay error={error} onRetry={fetchMonthlyData} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Monthly Report</h2>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={20} />
            <p>{monthName}</p>
          </div>
        </div>

        {monthTransactions.length === 0 ? (
          <EmptyState monthName={monthName} />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Transactions</h3>
                    <p className="text-2xl font-bold text-blue-900">{monthTransactions.length}</p>
                    <p className="text-xs text-blue-600 mt-1">Total count</p>
                  </div>
                  <Package className="text-blue-600" size={20} />
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-700">Revenue</h3>
                    <p className="text-2xl font-bold text-green-900">KES {(totalRevenue / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-green-600 mt-1">
                      {yoyGrowth >= 0 ? '↑' : '↓'} {Math.abs(yoyGrowth).toFixed(1)}% YoY
                    </p>
                  </div>
                  <DollarSign className="text-green-600" size={20} />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-700">Weight</h3>
                    <p className="text-2xl font-bold text-purple-900">{(totalWeight / 1000).toFixed(1)}T</p>
                    <p className="text-xs text-purple-600 mt-1">Metric tons</p>
                  </div>
                  <TrendingUp className="text-purple-600" size={20} />
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-orange-700">Avg Transaction</h3>
                    <p className="text-2xl font-bold text-orange-900">KES {avgTransactionValue.toFixed(0)}</p>
                    <p className="text-xs text-orange-600 mt-1">Per transaction</p>
                  </div>
                  <Target className="text-orange-600" size={20} />
                </div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-indigo-700">Suppliers</h3>
                    <p className="text-2xl font-bold text-indigo-900">{uniqueSuppliers}</p>
                    <p className="text-xs text-indigo-600 mt-1">Active suppliers</p>
                  </div>
                  <Users className="text-indigo-600" size={20} />
                </div>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-pink-700">Daily Avg</h3>
                    <p className="text-2xl font-bold text-pink-900">{dailyAverage.toFixed(1)}</p>
                    <p className="text-xs text-pink-600 mt-1">Transactions/day</p>
                  </div>
                  <BarChart3 className="text-pink-600" size={20} />
                </div>
              </div>
            </div>

            {/* Weekly Performance */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Weekly Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {weeklyBreakdown.map((week, index) => {
                      const prevWeek = weeklyBreakdown[index - 1];
                      const trend = prevWeek && prevWeek.revenue > 0 
                        ? ((week.revenue - prevWeek.revenue) / prevWeek.revenue * 100) 
                        : 0;
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {week.week}
                            {week.week === bestWeek.week && week.transactions > 0 && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Best
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{week.period}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{week.transactions}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            KES {week.revenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{week.weight.toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm">
                            {index > 0 && prevWeek && prevWeek.revenue > 0 && (
                              <span className={`font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Material Analysis */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Material Analysis</h3>
              {Object.keys(materialAnalysis).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No materials processed this month</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume (kg)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price/kg</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Range</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suppliers</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(materialAnalysis)
                        .sort(([,a], [,b]) => b.revenue - a.revenue)
                        .map(([material, stats]) => (
                          <tr key={material} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{material}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{stats.weight.toFixed(1)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              KES {stats.revenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              KES {stats.avgPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {stats.minPrice > 0 && stats.maxPrice > 0 ? (
                                <>KES {stats.minPrice.toFixed(2)} - {stats.maxPrice.toFixed(2)}</>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{stats.supplierCount}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Suppliers */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Top 10 Suppliers</h3>
              {topSuppliers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No supplier data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materials</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topSuppliers.map((supplier, index) => (
                        <tr key={supplier.name} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              #{index + 1}
                              {index === 0 && (
                                <Award className="text-yellow-500" size={16} />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{supplier.transactions}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            KES {supplier.revenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{supplier.weight.toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{supplier.materialCount} types</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Growth Comparison */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Growth Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Month-over-Month</h4>
                  <div className="flex items-center gap-2">
                    {monthOverMonthGrowth >= 0 ? (
                      <TrendingUp className="text-green-600" size={20} />
                    ) : (
                      <TrendingDown className="text-red-600" size={20} />
                    )}
                    <span className={`text-2xl font-bold ${monthOverMonthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {monthOverMonthGrowth >= 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-800 mt-1">
                    Compared to previous month
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Previous month: KES {previousMonthRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Year-over-Year</h4>
                  <div className="flex items-center gap-2">
                    {yoyGrowth >= 0 ? (
                      <TrendingUp className="text-green-600" size={20} />
                    ) : (
                      <TrendingDown className="text-red-600" size={20} />
                    )}
                    <span className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-purple-800 mt-1">
                    Compared to same month last year
                  </p>
                  <p className="text-xs text-purple-600 mt-2">
                    Previous year: KES {previousYearRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Key Achievements</h3>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• Total revenue: KES {totalRevenue.toLocaleString()}</li>
                  <li>• Year-over-year growth: {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%</li>
                  <li>• Average daily revenue: KES {(totalRevenue / daysInMonth).toFixed(0)}</li>
                  <li>• Most valuable material: {Object.entries(materialAnalysis).sort(([,a], [,b]) => b.revenue - a.revenue)[0]?.[0] || 'N/A'}</li>
                  <li>• Top supplier: {topSuppliers[0]?.name || 'N/A'}</li>
                  <li>• Best performing week: {bestWeek.week}</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Areas for Improvement</h3>
                <ul className="space-y-1 text-sm text-amber-800">
                  <li>• Increase supplier base (currently {uniqueSuppliers} active)</li>
                  <li>• Optimize pricing for low-performing materials</li>
                  <li>• Focus on high-margin materials</li>
                  <li>• Improve weekly consistency in collections</li>
                  <li>• Target daily average of {(dailyAverage * 1.2).toFixed(1)} transactions</li>
                  <li>• Strengthen relationships with top suppliers</li>
                </ul>
              </div>
            </div>

            {/* Monthly Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Monthly Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Total transactions: {monthTransactions.length}</li>
                    <li>• Average transaction value: KES {avgTransactionValue.toFixed(0)}</li>
                    <li>• Most popular material: {Object.entries(materialAnalysis).sort(([,a], [,b]) => b.transactions - a.transactions)[0]?.[0] || 'N/A'}</li>
                    <li>• Unique suppliers served: {uniqueSuppliers}</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Best week: {bestWeek.week} ({bestWeek.transactions} transactions)</li>
                    <li>• Total materials processed: {Object.keys(materialAnalysis).length} types</li>
                    <li>• Average daily transactions: {dailyAverage.toFixed(1)}</li>
                    <li>• Revenue per kg: KES {totalWeight > 0 ? (totalRevenue / totalWeight).toFixed(2) : '0'}</li>
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

export default MonthlyReport;