// src/components/reports/WeeklyReport.tsx - Real Supabase integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2, BarChart3, Target } from 'lucide-react';

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

interface WeeklyReportProps {
  weekStartDate?: Date;
}

interface DailyStats {
  day: string;
  date: string;
  transactions: number;
  revenue: number;
  weight: number;
}

interface MaterialPerformance {
  transactions: number;
  weight: number;
  revenue: number;
  avgPrice: number;
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading weekly report...</p>
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
const EmptyState = ({ weekRange }: { weekRange: string }) => (
  <div className="text-center py-12">
    <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4">
      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions This Week</h3>
    <p className="text-gray-600 mb-6">
      No transactions have been recorded for the week of {weekRange}
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
      <p className="text-sm text-blue-800">
        Weekly statistics will appear here as transactions are recorded throughout the week.
      </p>
    </div>
  </div>
);

const WeeklyReport: React.FC<WeeklyReportProps> = ({ weekStartDate = new Date() }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [previousWeekTransactions, setPreviousWeekTransactions] = useState<Transaction[]>([]);
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

      // Fetch current week transactions
      const { data: currentWeekData, error: currentWeekError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', startDateStr)
        .lte('transaction_date', endDateStr)
        .order('created_at', { ascending: false });

      if (currentWeekError) {
        throw new Error(`Error fetching current week transactions: ${currentWeekError.message}`);
      }

      // Fetch previous week transactions for comparison
      const { data: previousWeekData, error: previousWeekError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', prevStartDateStr)
        .lte('transaction_date', prevEndDateStr)
        .order('created_at', { ascending: false });

      if (previousWeekError) {
        console.warn('Could not fetch previous week data:', previousWeekError.message);
        setPreviousWeekTransactions([]);
      } else {
        setPreviousWeekTransactions(previousWeekData || []);
      }

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      setTransactions(currentWeekData || []);
      setSuppliers(suppliersData || []);

    } catch (err) {
      console.error('Error fetching weekly data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions for the current week
  const weekTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
  });

  // Calculate weekly stats
  const totalRevenue = weekTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const totalWeight = weekTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
  const avgDailyRevenue = totalRevenue / 7;
  const uniqueSuppliers = new Set(weekTransactions.map(t => t.supplier_id || t.walkin_name || 'unknown')).size;

  // Calculate previous week stats for comparison
  const previousWeekRevenue = previousWeekTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const revenueGrowth = previousWeekRevenue > 0 
    ? ((totalRevenue - previousWeekRevenue) / previousWeekRevenue * 100) 
    : totalRevenue > 0 ? 100 : 0;

  // Get supplier name helper function
  const getSupplierName = (transaction: Transaction): string => {
    if (transaction.is_walkin) {
      return transaction.walkin_name || 'Walk-in Customer';
    }
    
    const supplier = suppliers.find(s => s.id === transaction.supplier_id);
    return supplier?.name || 'Unknown Supplier';
  };

  // Daily breakdown
  const dailyStats: DailyStats[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    
    const dayTransactions = weekTransactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate.toDateString() === day.toDateString();
    });

    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      date: day.toLocaleDateString(),
      transactions: dayTransactions.length,
      revenue: dayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0),
      weight: dayTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0)
    };
  });

  // Material performance
  const materialPerformance = weekTransactions.reduce((acc, t) => {
    const material = t.material_type;
    if (!acc[material]) {
      acc[material] = { 
        transactions: 0, 
        weight: 0, 
        revenue: 0,
        avgPrice: 0
      };
    }
    acc[material].transactions++;
    acc[material].weight += t.weight_kg || 0;
    acc[material].revenue += t.total_amount || 0;
    acc[material].avgPrice = acc[material].weight > 0 ? acc[material].revenue / acc[material].weight : 0;
    return acc;
  }, {} as Record<string, MaterialPerformance>);

  // Top performing days
  const topPerformingDay = dailyStats.reduce((prev, current) => 
    prev.revenue > current.revenue ? prev : current
  );

  // Supplier performance this week
  const supplierPerformance = weekTransactions.reduce((acc, t) => {
    const supplierName = getSupplierName(t);
    if (!acc[supplierName]) {
      acc[supplierName] = { transactions: 0, revenue: 0, weight: 0 };
    }
    acc[supplierName].transactions++;
    acc[supplierName].revenue += t.total_amount || 0;
    acc[supplierName].weight += t.weight_kg || 0;
    return acc;
  }, {} as Record<string, { transactions: number; revenue: number; weight: number }>);

  const topSuppliers = Object.entries(supplierPerformance)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5);

  // Load data on component mount and when week changes
  useEffect(() => {
    fetchWeeklyData();
  }, [weekStartDate]);

  // Setup real-time subscription for this week's transactions
  useEffect(() => {
    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];
    
    const channel = supabase
      .channel('weekly-transactions')
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
          
          // Only add if it's within this week
          if (transactionDate >= startOfWeek && transactionDate <= endOfWeek) {
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
  }, [startOfWeek, endOfWeek]);

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
          <ErrorDisplay error={error} onRetry={fetchWeeklyData} />
        </div>
      </div>
    );
  }

  const weekRange = `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Weekly Report</h2>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={20} />
            <p>{weekRange}</p>
          </div>
        </div>

        {weekTransactions.length === 0 ? (
          <EmptyState weekRange={weekRange} />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Total Transactions</h3>
                    <p className="text-2xl font-bold text-blue-900">{weekTransactions.length}</p>
                    <p className="text-xs text-blue-600 mt-1">This week</p>
                  </div>
                  <Package className="text-blue-600" size={24} />
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-700">Total Revenue</h3>
                    <p className="text-2xl font-bold text-green-900">KES {totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}% vs last week
                    </p>
                  </div>
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-700">Total Weight</h3>
                    <p className="text-2xl font-bold text-purple-900">{totalWeight.toFixed(1)} kg</p>
                    <p className="text-xs text-purple-600 mt-1">Materials collected</p>
                  </div>
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-orange-700">Avg Daily Revenue</h3>
                    <p className="text-2xl font-bold text-orange-900">KES {avgDailyRevenue.toFixed(0)}</p>
                    <p className="text-xs text-orange-600 mt-1">Per day</p>
                  </div>
                  <Target className="text-orange-600" size={24} />
                </div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-indigo-700">Active Suppliers</h3>
                    <p className="text-2xl font-bold text-indigo-900">{uniqueSuppliers}</p>
                    <p className="text-xs text-indigo-600 mt-1">Unique suppliers</p>
                  </div>
                  <Users className="text-indigo-600" size={24} />
                </div>
              </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Daily Trend</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailyStats.map((day, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${day.transactions === 0 ? 'bg-gray-50' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{day.day}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{day.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {day.transactions}
                          {day.day === topPerformingDay.day && day.transactions > 0 && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Best Day
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          KES {day.revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{day.weight.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{weekTransactions.length}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">KES {totalRevenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{totalWeight.toFixed(1)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Material Performance */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Material Performance</h3>
              {Object.keys(materialPerformance).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No materials processed this week</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(materialPerformance)
                    .sort(([, a], [, b]) => b.revenue - a.revenue)
                    .map(([material, stats]) => (
                      <div key={material} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                        <h4 className="font-medium text-gray-900 mb-2">{material}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transactions:</span>
                            <span className="font-medium">{stats.transactions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Weight:</span>
                            <span className="font-medium">{stats.weight.toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-medium">KES {stats.revenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Price/kg:</span>
                            <span className="font-medium">KES {stats.avgPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Top Suppliers This Week */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Top Suppliers This Week</h3>
              {topSuppliers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No supplier data available</p>
              ) : (
                <div className="space-y-2">
                  {topSuppliers.map(([supplier, stats], index) => (
                    <div key={supplier} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{supplier}</span>
                          <p className="text-xs text-gray-500">{stats.weight.toFixed(1)} kg collected</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">KES {stats.revenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{stats.transactions} transactions</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Weekly Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Revenue {revenueGrowth >= 0 ? 'increased' : 'decreased'} by {Math.abs(revenueGrowth).toFixed(1)}% compared to last week</li>
                    <li>• Average daily transactions: {(weekTransactions.length / 7).toFixed(1)}</li>
                    <li>• Most profitable material: {Object.entries(materialPerformance).sort(([,a], [,b]) => b.revenue - a.revenue)[0]?.[0] || 'N/A'}</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• {uniqueSuppliers} unique suppliers contributed this week</li>
                    <li>• Best performing day: {topPerformingDay.day} ({topPerformingDay.transactions} transactions)</li>
                    <li>• Average transaction value: KES {weekTransactions.length > 0 ? (totalRevenue / weekTransactions.length).toFixed(0) : '0'}</li>
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