// src/components/reports/DailyReport.tsx - Real Supabase integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2 } from 'lucide-react';

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

interface DailyReportProps {
  currentDate?: Date;
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading daily report...</p>
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
const EmptyState = ({ currentDate }: { currentDate: Date }) => (
  <div className="text-center py-12">
    <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4">
      <Package className="w-12 h-12 text-gray-400 mx-auto" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions Today</h3>
    <p className="text-gray-600 mb-6">
      No transactions have been recorded for {currentDate.toLocaleDateString()}
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
      <p className="text-sm text-blue-800">
        Transactions will appear here as they are recorded throughout the day.
      </p>
    </div>
  </div>
);

const DailyReport: React.FC<DailyReportProps> = ({ currentDate = new Date() }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Supabase
  const fetchDailyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the date string for filtering (YYYY-MM-DD format)
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Fetch transactions for the specific date
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', dateString)
        .lt('transaction_date', `${dateString}T23:59:59`)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw new Error(`Error fetching transactions: ${transactionsError.message}`);
      }

      // Fetch suppliers (for supplier name lookup)
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      setTransactions(transactionsData || []);
      setSuppliers(suppliersData || []);

    } catch (err) {
      console.error('Error fetching daily data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions for today
  const todayTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return transactionDate.toDateString() === currentDate.toDateString();
  });

  // Calculate daily stats
  const totalRevenue = todayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const totalWeight = todayTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
  const avgPricePerKg = totalWeight > 0 ? totalRevenue / totalWeight : 0;

  // Group by material
  const materialBreakdown = todayTransactions.reduce((acc, t) => {
    const material = t.material_type;
    if (!acc[material]) {
      acc[material] = { count: 0, weight: 0, revenue: 0 };
    }
    acc[material].count++;
    acc[material].weight += t.weight_kg || 0;
    acc[material].revenue += t.total_amount || 0;
    return acc;
  }, {} as Record<string, { count: number; weight: number; revenue: number }>);

  // Get supplier name helper function
  const getSupplierName = (transaction: Transaction): string => {
    if (transaction.is_walkin) {
      return transaction.walkin_name || 'Walk-in Customer';
    }
    
    const supplier = suppliers.find(s => s.id === transaction.supplier_id);
    return supplier?.name || 'Unknown Supplier';
  };

  // Top suppliers analysis
  const supplierStats = todayTransactions.reduce((acc, t) => {
    const supplierName = getSupplierName(t);
    
    if (!acc[supplierName]) {
      acc[supplierName] = { transactions: 0, revenue: 0, weight: 0 };
    }
    acc[supplierName].transactions++;
    acc[supplierName].revenue += t.total_amount || 0;
    acc[supplierName].weight += t.weight_kg || 0;
    return acc;
  }, {} as Record<string, { transactions: number; revenue: number; weight: number }>);

  const topSuppliers = Object.entries(supplierStats)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5);

  // Payment method breakdown
  const paymentMethodStats = todayTransactions.reduce((acc, t) => {
    const method = t.payment_method || 'cash';
    if (!acc[method]) {
      acc[method] = { count: 0, amount: 0 };
    }
    acc[method].count++;
    acc[method].amount += t.total_amount || 0;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  // Hourly distribution
  const hourlyStats = todayTransactions.reduce((acc, t) => {
    const hour = new Date(t.created_at).getHours();
    const hourKey = `${hour}:00`;
    
    if (!acc[hourKey]) {
      acc[hourKey] = { transactions: 0, revenue: 0 };
    }
    acc[hourKey].transactions++;
    acc[hourKey].revenue += t.total_amount || 0;
    return acc;
  }, {} as Record<string, { transactions: number; revenue: number }>);

  // Get peak hour
  const peakHour = Object.entries(hourlyStats)
    .sort(([, a], [, b]) => b.transactions - a.transactions)[0];

  // Calculate quality grades distribution
  const qualityGrades = todayTransactions.reduce((acc, t) => {
    const grade = t.quality_grade || 'Ungraded';
    if (!acc[grade]) {
      acc[grade] = { count: 0, weight: 0 };
    }
    acc[grade].count++;
    acc[grade].weight += t.weight_kg || 0;
    return acc;
  }, {} as Record<string, { count: number; weight: number }>);

  // Load data on component mount and when date changes
  useEffect(() => {
    fetchDailyData();
  }, [currentDate]);

  // Setup real-time subscription for today's transactions
  useEffect(() => {
    const dateString = currentDate.toISOString().split('T')[0];
    
    const channel = supabase
      .channel('daily-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `transaction_date=gte.${dateString}`
        },
        (payload) => {
          const newTransaction = payload.new as Transaction;
          const transactionDate = new Date(newTransaction.transaction_date);
          
          // Only add if it's for today
          if (transactionDate.toDateString() === currentDate.toDateString()) {
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
          filter: `transaction_date=gte.${dateString}`
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
  }, [currentDate]);

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
          <ErrorDisplay error={error} onRetry={fetchDailyData} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Daily Report</h2>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={20} />
            <p>{currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        </div>

        {todayTransactions.length === 0 ? (
          <EmptyState currentDate={currentDate} />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Transactions</h3>
                    <p className="text-2xl font-bold text-blue-900">{todayTransactions.length}</p>
                    <p className="text-xs text-blue-600 mt-1">Today's total</p>
                  </div>
                  <Package className="text-blue-600" size={24} />
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-700">Revenue</h3>
                    <p className="text-2xl font-bold text-green-900">KES {totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">Total earnings</p>
                  </div>
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-700">Weight</h3>
                    <p className="text-2xl font-bold text-purple-900">{totalWeight.toFixed(1)} kg</p>
                    <p className="text-xs text-purple-600 mt-1">Total collected</p>
                  </div>
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-orange-700">Avg Price</h3>
                    <p className="text-2xl font-bold text-orange-900">KES {avgPricePerKg.toFixed(2)}</p>
                    <p className="text-xs text-orange-600 mt-1">Per kilogram</p>
                  </div>
                  <div className="text-orange-600 text-xl font-bold">⚖️</div>
                </div>
              </div>
            </div>

            {/* Material Breakdown */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Material Breakdown</h3>
              {Object.keys(materialBreakdown).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No materials processed today</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price/kg</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(materialBreakdown)
                        .sort(([,a], [,b]) => b.revenue - a.revenue)
                        .map(([material, stats]) => (
                          <tr key={material} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{material}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{stats.count}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{stats.weight.toFixed(1)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              KES {stats.revenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              KES {stats.weight > 0 ? (stats.revenue / stats.weight).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Suppliers */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Top Suppliers Today</h3>
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
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-sm text-gray-600">{stats.transactions} transactions</span>
                          <p className="text-sm font-medium text-gray-900">
                            KES {stats.revenue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Payment Methods */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Payment Methods</h4>
                <div className="space-y-2">
                  {Object.entries(paymentMethodStats).map(([method, stats]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">{method.replace('_', ' ')}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{stats.count} transactions</span>
                        <p className="text-xs text-gray-500">KES {stats.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Grades */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Quality Grades</h4>
                <div className="space-y-2">
                  {Object.entries(qualityGrades).map(([grade, stats]) => (
                    <div key={grade} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{grade}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{stats.count} batches</span>
                        <p className="text-xs text-gray-500">{stats.weight.toFixed(1)} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Daily Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Total transactions: {todayTransactions.length}</li>
                    <li>• Average transaction value: KES {todayTransactions.length > 0 ? (totalRevenue / todayTransactions.length).toFixed(0) : '0'}</li>
                    <li>• Most popular material: {Object.entries(materialBreakdown).sort(([,a], [,b]) => b.count - a.count)[0]?.[0] || 'None'}</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Unique suppliers: {Object.keys(supplierStats).length}</li>
                    <li>• Peak hour: {peakHour ? peakHour[0] : 'N/A'}</li>
                    <li>• Payment methods used: {Object.keys(paymentMethodStats).length}</li>
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