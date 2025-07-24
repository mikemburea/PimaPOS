// src/components/reports/MonthlyReport.tsx - Updated to use shared types and utilities
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2, BarChart3, Target, Award, TrendingDown } from 'lucide-react';

// Import shared types and utilities
import {
  DatabaseTransaction,
  DatabaseSupplier,
  getSupplierName,
  calculateMaterialBreakdown,
  calculateSupplierStats,
  formatCurrency,
  formatWeight,
  formatPercentage,
  getDateRange
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

// FIXED: Updated MonthlyReportProps to match what App.tsx passes
interface MonthlyReportProps {
  transactions: ReportTransaction[];
  month: Date;
}

// Additional interfaces for monthly-specific data
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
const MonthlyReport: React.FC<MonthlyReportProps> = ({ transactions, month }) => {
  const [suppliers, setSuppliers] = useState<DatabaseSupplier[]>([]);
  const [previousMonthTransactions, setPreviousMonthTransactions] = useState<ReportTransaction[]>([]);
  const [previousYearTransactions, setPreviousYearTransactions] = useState<ReportTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate month range using utility function
  const { start: startOfMonth, end: endOfMonth } = getDateRange('month', month, month);
  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate previous month range for comparison
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const { start: startOfPreviousMonth, end: endOfPreviousMonth } = getDateRange('month', previousMonth, previousMonth);

  // Calculate same month previous year for YoY comparison
  const previousYear = new Date(month.getFullYear() - 1, month.getMonth(), 1);
  const { start: startOfPreviousYear, end: endOfPreviousYear } = getDateRange('month', previousYear, previousYear);

  // Fetch suppliers and historical data
  const fetchAdditionalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch suppliers from Supabase
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      setSuppliers(suppliersData || []);

      // For historical comparison, we'd ideally want this from parent component
      // For now, we'll use empty arrays and note this limitation
      setPreviousMonthTransactions([]);
      setPreviousYearTransactions([]);

    } catch (err) {
      console.error('Error fetching additional data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions for the current month using prop data
  const monthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
  });

  // Transform to database format for utility functions
  const dbTransactions = monthTransactions.map(transformReportToDatabase);

  // Calculate monthly stats using utility functions
  const materialBreakdown = calculateMaterialBreakdown(dbTransactions);
  const supplierStats = calculateSupplierStats(dbTransactions, suppliers);
  
  const totalRevenue = dbTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const totalWeight = dbTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
  const avgTransactionValue = monthTransactions.length > 0 ? totalRevenue / monthTransactions.length : 0;
  const uniqueSuppliers = Object.keys(supplierStats).length;

  // Calculate days in month for daily average
  const daysInMonth = endOfMonth.getDate();
  const dailyAverage = monthTransactions.length / daysInMonth;

  // Calculate previous month stats for comparison (limited without historical data)
  const previousMonthRevenue = previousMonthTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const monthOverMonthGrowth = previousMonthRevenue > 0 
    ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue * 100) 
    : totalRevenue > 0 ? 100 : 0;

  // Calculate YoY comparison (limited without historical data)
  const previousYearRevenue = previousYearTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const yoyGrowth = previousYearRevenue > 0 
    ? ((totalRevenue - previousYearRevenue) / previousYearRevenue * 100) 
    : totalRevenue > 0 ? 100 : 0;

  // Weekly breakdown using prop transactions
  const weeklyBreakdown: WeeklyBreakdown[] = [];
  let weekStart = new Date(startOfMonth);
  
  while (weekStart <= endOfMonth) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const actualWeekEnd = weekEnd > endOfMonth ? endOfMonth : weekEnd;
    
    const weekTransactions = monthTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= weekStart && transactionDate <= actualWeekEnd;
    });

    weeklyBreakdown.push({
      week: `Week ${weeklyBreakdown.length + 1}`,
      period: `${weekStart.toLocaleDateString()} - ${actualWeekEnd.toLocaleDateString()}`,
      transactions: weekTransactions.length,
      revenue: weekTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      weight: weekTransactions.reduce((sum, t) => sum + (t.weight || 0), 0)
    });

    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  // Enhanced material analysis using both utility functions and custom logic
  const enhancedMaterialAnalysis = monthTransactions.reduce((acc, t) => {
    const material = t.material;
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
    
    const weight = t.weight || 0;
    const amount = t.totalAmount || 0;
    const pricePerKg = weight > 0 ? amount / weight : 0;
    
    acc[material].transactions++;
    acc[material].weight += weight;
    acc[material].revenue += amount;
    acc[material].suppliers.add(t.supplierId || t.walkinName || 'unknown');
    
    if (pricePerKg > 0) {
      acc[material].minPrice = Math.min(acc[material].minPrice, pricePerKg);
      acc[material].maxPrice = Math.max(acc[material].maxPrice, pricePerKg);
    }
    
    return acc;
  }, {} as Record<string, MaterialAnalysis>);

  // Calculate average prices and supplier counts
  Object.keys(enhancedMaterialAnalysis).forEach(material => {
    const analysis = enhancedMaterialAnalysis[material];
    analysis.avgPrice = analysis.weight > 0 ? analysis.revenue / analysis.weight : 0;
    analysis.supplierCount = analysis.suppliers.size;
    
    // Handle case where no valid prices were found
    if (analysis.minPrice === Infinity) {
      analysis.minPrice = 0;
    }
  });

  // Top performing suppliers using utility stats
  const topSuppliers = Object.entries(supplierStats)
    .map(([name, stats]) => ({
      name,
      transactions: stats.transactions,
      revenue: stats.revenue,
      weight: stats.weight,
      materials: new Set(monthTransactions.filter(t => t.supplierName === name).map(t => t.material)),
      materialCount: 0
    }))
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

  // Load additional data on component mount
  useEffect(() => {
    fetchAdditionalData();
  }, [month]);

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
          <ErrorDisplay error={error} onRetry={fetchAdditionalData} />
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

        {/* Show data source indicator */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✓ Using {transactions.length} total transactions ({monthTransactions.length} in {monthName})
          </p>
        </div>

        {monthTransactions.length === 0 ? (
          <EmptyState monthName={monthName} />
        ) : (
          <>
            {/* Summary Cards - Using utility formatting functions */}
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
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(totalRevenue / 1000)}K</p>
                    <p className="text-xs text-green-600 mt-1">
                      {yoyGrowth >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(yoyGrowth))} vs last year*
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
                    <p className="text-2xl font-bold text-orange-900">{formatCurrency(avgTransactionValue)}</p>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
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
                            {formatCurrency(week.revenue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatWeight(week.weight)}</td>
                          <td className="px-4 py-3 text-sm">
                            {index > 0 && prevWeek && prevWeek.revenue > 0 && (
                              <span className={`font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trend >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(trend))}
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

            {/* Material Analysis - Using utility calculations and formatting */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Material Analysis</h3>
              {Object.keys(enhancedMaterialAnalysis).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No materials processed this month</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price/kg</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Range</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suppliers</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(enhancedMaterialAnalysis)
                        .sort(([,a], [,b]) => b.revenue - a.revenue)
                        .map(([material, stats]) => (
                          <tr key={material} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{material}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatWeight(stats.weight)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {formatCurrency(stats.revenue)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatCurrency(stats.avgPrice)}/kg
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {stats.minPrice > 0 && stats.maxPrice > 0 ? (
                                <>{formatCurrency(stats.minPrice)}/kg - {formatCurrency(stats.maxPrice)}/kg</>
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

            {/* Top Suppliers - Using utility calculations and formatting */}
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
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
                            {formatCurrency(supplier.revenue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatWeight(supplier.weight)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{supplier.materialCount} types</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Growth Comparison - Using utility formatting */}
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
                      {monthOverMonthGrowth >= 0 ? '+' : ''}{formatPercentage(monthOverMonthGrowth)}*
                    </span>
                  </div>
                  <p className="text-sm text-blue-800 mt-1">
                    Compared to previous month
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Previous month: {formatCurrency(previousMonthRevenue)}
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
                      {yoyGrowth >= 0 ? '+' : ''}{formatPercentage(yoyGrowth)}*
                    </span>
                  </div>
                  <p className="text-sm text-purple-800 mt-1">
                    Compared to same month last year
                  </p>
                  <p className="text-xs text-purple-600 mt-2">
                    Previous year: {formatCurrency(previousYearRevenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Summary - Using utility formatting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Key Achievements</h3>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• Total revenue: {formatCurrency(totalRevenue)}</li>
                  <li>• Using {transactions.length} total transactions in dataset</li>
                  <li>• Average daily revenue: {formatCurrency(totalRevenue / daysInMonth)}</li>
                  <li>• Most valuable material: {Object.entries(enhancedMaterialAnalysis).sort(([,a], [,b]) => b.revenue - a.revenue)[0]?.[0] || 'N/A'}</li>
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

            {/* Monthly Insights - Using utility calculations and formatting */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Monthly Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Total transactions: {monthTransactions.length}</li>
                    <li>• Average transaction value: {formatCurrency(avgTransactionValue)}</li>
                    <li>• Most popular material: {Object.entries(enhancedMaterialAnalysis).sort(([,a], [,b]) => b.transactions - a.transactions)[0]?.[0] || 'N/A'}</li>
                    <li>• Unique suppliers served: {uniqueSuppliers}</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Best week: {bestWeek.week} ({bestWeek.transactions} transactions)</li>
                    <li>• Total materials processed: {Object.keys(enhancedMaterialAnalysis).length} types</li>
                    <li>• Average daily transactions: {dailyAverage.toFixed(1)}</li>
                    <li>• Revenue per kg: {totalWeight > 0 ? formatCurrency(totalRevenue / totalWeight) : formatCurrency(0)}/kg</li>
                  </ul>
                </div>
              </div>
              {previousMonthTransactions.length === 0 && previousYearTransactions.length === 0 && (
                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    * Growth comparisons limited without historical data. Consider implementing period-over-period tracking.
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

export default MonthlyReport;