// src/components/reports/DailyReport.tsx - Updated to use shared types and utilities
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2 } from 'lucide-react';

// Import shared types and utilities
import {
  DatabaseTransaction,
  DatabaseSupplier,
  DailyReportData,
  getSupplierName,
  calculateMaterialBreakdown,
  calculateSupplierStats,
  calculatePaymentMethodStats,
  calculateQualityGradeStats,
  calculateHourlyStats,
  getPeakHour,
  formatCurrency,
  formatWeight,
  formatPercentage,
  isToday,
  transformDatabaseTransaction
} from '../../types/reportTypes';

// FIXED: Interface to match App.tsx expectations
interface ReportTransaction {
  id: string;
  date: string;
  material: string;
  supplierName: string;
  supplierId: string;
  totalAmount: number;
  weight: number;
  createdAt: string;
  paymentStatus: string;
  isWalkin: boolean;
  walkinName?: string | null;
}

// FIXED: Updated DailyReportProps to match what App.tsx passes
interface DailyReportProps {
  currentDate: Date;
  transactions: ReportTransaction[];
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

// Transform ReportTransaction to DatabaseTransaction for utility functions
const transformReportToDatabase = (reportTx: ReportTransaction): DatabaseTransaction => {
  return {
    id: reportTx.id,
    supplier_id: reportTx.isWalkin ? null : reportTx.supplierId,
    material_type: reportTx.material,
    transaction_date: reportTx.date,
    total_amount: reportTx.totalAmount,
    created_at: reportTx.createdAt,
    is_walkin: reportTx.isWalkin,
    walkin_name: reportTx.walkinName,
    weight_kg: reportTx.weight,
    payment_status: reportTx.paymentStatus,
    payment_method: reportTx.paymentStatus === 'completed' ? 'cash' : 'pending',
    quality_grade: reportTx.paymentStatus === 'completed' ? 'Grade A' : 'Pending',
    transaction_number: null,
    walkin_phone: null,
    material_category: null,
    unit_price: reportTx.weight > 0 ? reportTx.totalAmount / reportTx.weight : 0,
    payment_reference: null,
    deductions: null,
    final_amount: reportTx.totalAmount,
    receipt_number: null,
    notes: null,
    created_by: null,
    updated_at: null
  };
};

// FIXED: Updated component to use shared types and utilities
const DailyReport: React.FC<DailyReportProps> = ({ currentDate, transactions }) => {
  const [suppliers, setSuppliers] = useState<DatabaseSupplier[]>([]);
  const [realtimeTransactions, setRealtimeTransactions] = useState<ReportTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<DailyReportData | null>(null);

  // Fetch suppliers for additional data
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch suppliers (for additional supplier info if needed)
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      setSuppliers(suppliersData || []);

    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions for today using prop data
  const todayTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.toDateString() === currentDate.toDateString();
  });

  // Merge with any real-time transactions
  const allTodayTransactions = [
    ...todayTransactions,
    ...realtimeTransactions.filter(rt => 
      !todayTransactions.some(tt => tt.id === rt.id)
    )
  ];

  // Calculate report data using utility functions
  useEffect(() => {
    if (allTodayTransactions.length > 0 && suppliers.length > 0) {
      // Transform ReportTransactions to DatabaseTransactions for utility functions
      const dbTransactions = allTodayTransactions.map(transformReportToDatabase);
      
      // Calculate all stats using utility functions
      const materialBreakdown = calculateMaterialBreakdown(dbTransactions);
      const supplierStats = calculateSupplierStats(dbTransactions, suppliers);
      const paymentMethodStats = calculatePaymentMethodStats(dbTransactions);
      const qualityGradeStats = calculateQualityGradeStats(dbTransactions);
      const hourlyStats = calculateHourlyStats(dbTransactions);
      
      const totalRevenue = dbTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const totalWeight = dbTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
      const avgPricePerKg = totalWeight > 0 ? totalRevenue / totalWeight : 0;
      const uniqueSuppliers = Object.keys(supplierStats).length;
      const peakHour = getPeakHour(hourlyStats);
      const averageTransactionValue = dbTransactions.length > 0 ? totalRevenue / dbTransactions.length : 0;

      setReportData({
        transactions: dbTransactions,
        suppliers,
        totalRevenue,
        totalWeight,
        avgPricePerKg,
        materialBreakdown,
        supplierStats,
        paymentMethodStats,
        qualityGradeStats,
        hourlyStats,
        uniqueSuppliers,
        peakHour,
        averageTransactionValue
      });
    }
  }, [allTodayTransactions, suppliers]);

  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
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
          const newDbTransaction = payload.new as DatabaseTransaction;
          const transactionDate = new Date(newDbTransaction.transaction_date);
          
          // Only add if it's for today and not already in props
          if (transactionDate.toDateString() === currentDate.toDateString()) {
            // Transform DB transaction to ReportTransaction format
            const newReportTransaction: ReportTransaction = {
              id: newDbTransaction.id,
              date: newDbTransaction.transaction_date,
              material: newDbTransaction.material_type,
              supplierName: getSupplierName(newDbTransaction, suppliers),
              supplierId: newDbTransaction.supplier_id || 'walk-in',
              totalAmount: newDbTransaction.total_amount || 0,
              weight: newDbTransaction.weight_kg || 0,
              createdAt: newDbTransaction.created_at,
              paymentStatus: newDbTransaction.payment_status || 'pending',
              isWalkin: newDbTransaction.is_walkin,
              walkinName: newDbTransaction.walkin_name
            };
            
            setRealtimeTransactions(current => [newReportTransaction, ...current]);
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
          const updatedDbTransaction = payload.new as DatabaseTransaction;
          
          // Transform and update in realtime transactions
          const updatedReportTransaction: ReportTransaction = {
            id: updatedDbTransaction.id,
            date: updatedDbTransaction.transaction_date,
            material: updatedDbTransaction.material_type,
            supplierName: getSupplierName(updatedDbTransaction, suppliers),
            supplierId: updatedDbTransaction.supplier_id || 'walk-in',
            totalAmount: updatedDbTransaction.total_amount || 0,
            weight: updatedDbTransaction.weight_kg || 0,
            createdAt: updatedDbTransaction.created_at,
            paymentStatus: updatedDbTransaction.payment_status || 'pending',
            isWalkin: updatedDbTransaction.is_walkin,
            walkinName: updatedDbTransaction.walkin_name
          };

          setRealtimeTransactions(current =>
            current.map(t => t.id === updatedReportTransaction.id ? updatedReportTransaction : t)
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentDate, suppliers]);

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
          <ErrorDisplay error={error} onRetry={fetchSuppliers} />
        </div>
      </div>
    );
  }

  // Use fallback values if reportData is not available
  const data = reportData || {
    totalRevenue: allTodayTransactions.reduce((sum, t) => sum + t.totalAmount, 0),
    totalWeight: allTodayTransactions.reduce((sum, t) => sum + t.weight, 0),
    avgPricePerKg: 0,
    materialBreakdown: {},
    supplierStats: {},
    paymentMethodStats: {},
    qualityGradeStats: {},
    hourlyStats: {},
    uniqueSuppliers: 0,
    peakHour: 'N/A',
    averageTransactionValue: 0
  };

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

        {/* Show data source indicator */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✓ Using {transactions.length} total transactions ({allTodayTransactions.length} for today)
            {realtimeTransactions.length > 0 && (
              <span> • {realtimeTransactions.length} real-time updates</span>
            )}
          </p>
        </div>

        {allTodayTransactions.length === 0 ? (
          <EmptyState currentDate={currentDate} />
        ) : (
          <>
            {/* Summary Cards - Using utility formatting functions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Transactions</h3>
                    <p className="text-2xl font-bold text-blue-900">{allTodayTransactions.length}</p>
                    <p className="text-xs text-blue-600 mt-1">Today's total</p>
                  </div>
                  <Package className="text-blue-600" size={24} />
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-700">Revenue</h3>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(data.totalRevenue)}</p>
                    <p className="text-xs text-green-600 mt-1">Total earnings</p>
                  </div>
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-700">Weight</h3>
                    <p className="text-2xl font-bold text-purple-900">{formatWeight(data.totalWeight)}</p>
                    <p className="text-xs text-purple-600 mt-1">Total collected</p>
                  </div>
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-orange-700">Avg Price</h3>
                    <p className="text-2xl font-bold text-orange-900">{formatCurrency(data.avgPricePerKg)}/kg</p>
                    <p className="text-xs text-orange-600 mt-1">Per kilogram</p>
                  </div>
                  <div className="text-orange-600 text-xl font-bold">⚖️</div>
                </div>
              </div>
            </div>

            {/* Material Breakdown - Using utility calculations */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Material Breakdown</h3>
              {Object.keys(data.materialBreakdown).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No materials processed today</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price/kg</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(data.materialBreakdown)
                        .sort(([,a], [,b]) => b.revenue - a.revenue)
                        .map(([material, stats]) => (
                          <tr key={material} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{material}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{stats.count}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatWeight(stats.weight)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {formatCurrency(stats.revenue)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatCurrency(stats.avgPrice)}/kg
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Suppliers - Using utility calculations */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Top Suppliers Today</h3>
              {Object.keys(data.supplierStats).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No supplier data available</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.supplierStats)
                    .sort(([, a], [, b]) => b.revenue - a.revenue)
                    .slice(0, 5)
                    .map(([supplier, stats], index) => (
                      <div key={supplier} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{supplier}</span>
                            <p className="text-xs text-gray-500">{formatWeight(stats.weight)} collected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-sm text-gray-600">{stats.transactions} transactions</span>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(stats.revenue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Additional Insights - Using utility calculations and formatting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Payment Methods */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Payment Status</h4>
                <div className="space-y-2">
                  {Object.entries(data.paymentMethodStats).map(([method, stats]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">{method.replace('_', ' ')}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {stats.count} ({formatPercentage(stats.percentage)})
                        </span>
                        <p className="text-xs text-gray-500">{formatCurrency(stats.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Grades */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Quality Status</h4>
                <div className="space-y-2">
                  {Object.entries(data.qualityGradeStats).map(([grade, stats]) => (
                    <div key={grade} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{grade}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {stats.count} ({formatPercentage(stats.percentage)})
                        </span>
                        <p className="text-xs text-gray-500">{formatWeight(stats.weight)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today's Transactions Table */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Today's Transactions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allTodayTransactions
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {transaction.supplierName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {transaction.material}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatWeight(transaction.weight)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {formatCurrency(transaction.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              transaction.paymentStatus === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Insights - Using utility calculations and formatting */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Daily Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Using {transactions.length} total transactions ({allTodayTransactions.length} today)</li>
                    <li>• Average transaction value: {formatCurrency(data.averageTransactionValue)}</li>
                    <li>• Most popular material: {Object.entries(data.materialBreakdown).sort(([,a], [,b]) => b.count - a.count)[0]?.[0] || 'None'}</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Unique suppliers: {data.uniqueSuppliers}</li>
                    <li>• Peak hour: {data.peakHour}</li>
                    <li>• Real-time updates active</li>
                  </ul>
                </div>
              </div>
              {realtimeTransactions.length === 0 && (
                <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-800">
                    ✓ Real-time synchronization active. New transactions will appear automatically.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyReport;