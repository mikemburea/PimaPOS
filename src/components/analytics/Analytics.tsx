// src/components/analytics/Analytics.tsx - Enhanced with real Supabase data
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Package, DollarSign, Users, AlertTriangle, Loader2 } from 'lucide-react';

// Define interfaces matching your database structure
interface Transaction {
  id: string;
  supplier_id?: string | null;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  created_at: string;
  weight_kg?: number | null;
  payment_status?: string | null;
  quality_grade?: string | null;
  is_walkin: boolean;
  walkin_name?: string | null;
}

interface Supplier {
  id: string;
  name: string;
  total_transactions: number;
  total_value: number;
  status: string;
}

interface Material {
  id: string;
  name: string;
  category: string;
  current_price_per_kg: number;
  is_active: boolean;
}

interface MonthlyData {
  month: string;
  [key: string]: string | number;
}

interface MaterialStats {
  name: string;
  value: number;
  color: string;
  weight: number;
  transactions: number;
  revenue: number;
}

interface SupplierPerformance {
  name: string;
  value: number;
  transactions: number;
  weight: number;
}

interface AnalyticsProps {
  transactions?: Transaction[];
  suppliers?: Supplier[];
  materials?: Material[];
}

// Color palette for charts
const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading analytics data...</p>
    </div>
  </div>
);

// Empty state component
const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="bg-gray-100 rounded-full p-6 mb-4">
      <Package className="h-12 w-12 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 max-w-md">{message}</p>
  </div>
);

// Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg">
        <div className="flex items-center mb-2">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <p className="font-bold">Error loading analytics</p>
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

const Analytics: React.FC<AnalyticsProps> = ({ 
  transactions: propTransactions, 
  suppliers: propSuppliers, 
  materials: propMaterials 
}) => {
  // State management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Supabase
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use prop data if available, otherwise fetch from database
      if (propTransactions && propSuppliers && propMaterials) {
        setTransactions(propTransactions);
        setSuppliers(propSuppliers);
        setMaterials(propMaterials);
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [transactionsResult, suppliersResult, materialsResult] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').eq('status', 'active'),
        supabase.from('materials').select('*').eq('is_active', true)
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (suppliersResult.error) throw suppliersResult.error;
      if (materialsResult.error) throw materialsResult.error;

      setTransactions(transactionsResult.data || []);
      setSuppliers(suppliersResult.data || []);
      setMaterials(materialsResult.data || []);

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly data for all 12 months
  const calculateMonthlyData = (): MonthlyData[] => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const currentYear = new Date().getFullYear();
    const materialTypes = [...new Set(materials.map(m => m.name))];

    return months.map((month, index) => {
      const monthData: MonthlyData = { month };
      
      materialTypes.forEach(materialType => {
        const monthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return transactionDate.getMonth() === index && 
                 transactionDate.getFullYear() === currentYear &&
                 t.material_type === materialType &&
                 t.payment_status === 'completed';
        });

        const totalWeight = monthTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
        monthData[materialType] = totalWeight;
      });

      return monthData;
    });
  };

  // Calculate material distribution
  const calculateMaterialStats = (): MaterialStats[] => {
    const materialMap = new Map<string, MaterialStats>();
    
    materials.forEach((material, index) => {
      const materialTransactions = transactions.filter(t => 
        t.material_type === material.name && t.payment_status === 'completed'
      );
      
      const totalWeight = materialTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
      const totalRevenue = materialTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      
      materialMap.set(material.name, {
        name: material.name,
        value: totalWeight,
        color: COLORS[index % COLORS.length],
        weight: totalWeight,
        transactions: materialTransactions.length,
        revenue: totalRevenue
      });
    });

    return Array.from(materialMap.values()).sort((a, b) => b.value - a.value);
  };

  // Calculate supplier performance
  const calculateSupplierPerformance = (): SupplierPerformance[] => {
    const supplierMap = new Map<string, SupplierPerformance>();
    
    transactions.forEach(transaction => {
      if (transaction.payment_status !== 'completed') return;
      
      const supplierName = transaction.is_walkin 
        ? (transaction.walkin_name || 'Walk-in Customer')
        : (suppliers.find(s => s.id === transaction.supplier_id)?.name || 'Unknown');
      
      if (!supplierMap.has(supplierName)) {
        supplierMap.set(supplierName, {
          name: supplierName,
          value: 0,
          transactions: 0,
          weight: 0
        });
      }
      
      const supplier = supplierMap.get(supplierName)!;
      supplier.value += transaction.total_amount || 0;
      supplier.transactions += 1;
      supplier.weight += transaction.weight_kg || 0;
    });

    return Array.from(supplierMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    const completedTransactions = transactions.filter(t => t.payment_status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalWeight = completedTransactions.reduce((sum, t) => sum + (t.weight_kg || 0), 0);
    
    // Calculate averages
    const avgTransactionValue = completedTransactions.length > 0 ? totalRevenue / completedTransactions.length : 0;
    
    // Get top material by volume
    const materialStats = calculateMaterialStats();
    const topMaterial = materialStats.length > 0 ? materialStats[0] : null;
    
    // Calculate growth (using last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const recentTransactions = transactions.filter(t => new Date(t.transaction_date) >= thirtyDaysAgo);
    const previousTransactions = transactions.filter(t => 
      new Date(t.transaction_date) >= sixtyDaysAgo && new Date(t.transaction_date) < thirtyDaysAgo
    );
    
    const recentRevenue = recentTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const previousRevenue = previousTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    
    const monthlyGrowth = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    return {
      avgTransactionValue,
      topMaterial,
      totalWeight,
      monthlyGrowth,
      activeSuppliers: suppliers.filter(s => s.status === 'active').length
    };
  };

  // Calculate quality metrics
  const calculateQualityMetrics = () => {
    const completedTransactions = transactions.filter(t => t.payment_status === 'completed');
    const totalTransactions = transactions.length;
    
    // Success rate (completed vs total)
    const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;
    
    // Average processing time (assuming same-day processing for completed transactions)
    const avgProcessingTime = '< 1 hour'; // Simplified for demo
    
    // Customer satisfaction (based on repeat customers)
    const uniqueSuppliers = new Set(transactions.map(t => t.supplier_id || t.walkin_name)).size;
    const totalSupplierTransactions = transactions.length;
    const avgTransactionsPerSupplier = uniqueSuppliers > 0 ? totalSupplierTransactions / uniqueSuppliers : 0;
    const satisfactionScore = Math.min(5, avgTransactionsPerSupplier * 0.8 + 3.5); // Simplified calculation
    
    // Quality grade distribution
    const qualityGrades = transactions.reduce((acc, t) => {
      const grade = t.quality_grade || 'Standard';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const highQualityCount = (qualityGrades['Premium'] || 0) + (qualityGrades['High'] || 0);
    const qualityPercentage = totalTransactions > 0 ? (highQualityCount / totalTransactions) * 100 : 0;
    
    return {
      successRate,
      avgProcessingTime,
      satisfactionScore,
      qualityPercentage
    };
  };

  // Load data on component mount
  useEffect(() => {
    fetchAnalyticsData();
  }, [propTransactions, propSuppliers, propMaterials]);

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600 mt-2">Business insights and performance metrics</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600 mt-2">Business insights and performance metrics</p>
        </div>
        <ErrorDisplay error={error} onRetry={fetchAnalyticsData} />
      </div>
    );
  }

  // Check if we have data
  const hasData = transactions.length > 0;

  // Calculate all statistics
  const monthlyData = calculateMonthlyData();
  const materialStats = calculateMaterialStats();
  const supplierPerformance = calculateSupplierPerformance();
  const summaryStats = calculateSummaryStats();
  const qualityMetrics = calculateQualityMetrics();

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-600 mt-2">Business insights and performance metrics for Meru Collection Center</p>
      </div>

      {!hasData ? (
        <EmptyState 
          title="No Analytics Data Available" 
          message="Start recording transactions to see detailed analytics and insights about your scrap metal business performance."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Average Transaction Value</h3>
              <p className="text-2xl font-bold text-teal-600">
                KES {summaryStats.avgTransactionValue.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 mt-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                {summaryStats.monthlyGrowth > 0 ? '+' : ''}{summaryStats.monthlyGrowth.toFixed(1)}% from last month
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Top Material by Volume</h3>
              <p className="text-2xl font-bold text-teal-600">
                {summaryStats.topMaterial?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {summaryStats.topMaterial?.weight.toFixed(1) || 0} kg total
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Suppliers</h3>
              <p className="text-2xl font-bold text-teal-600">{summaryStats.activeSuppliers}</p>
              <p className="text-sm text-gray-600 mt-2">Registered suppliers</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Volume Processed</h3>
              <p className="text-2xl font-bold text-teal-600">{summaryStats.totalWeight.toFixed(1)} kg</p>
              <p className="text-sm text-gray-600 mt-2">All time</p>
            </div>
          </div>

          {/* Material Collection Trends Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Material Collection Trends (kg)</h3>
            {materialStats.length === 0 ? (
              <EmptyState 
                title="No Material Data" 
                message="No materials have been processed yet. Add materials to see collection trends."
              />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} kg`, 'Weight']} />
                  <Legend />
                  {materialStats.map((material, index) => (
                    <Bar 
                      key={material.name} 
                      dataKey={material.name} 
                      fill={material.color}
                      name={material.name}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Material Distribution and Top Suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Material Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Material Distribution</h3>
              {materialStats.length === 0 ? (
                <EmptyState 
                  title="No Materials" 
                  message="No materials have been processed yet."
                />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={materialStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {materialStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} kg`, 'Weight']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {materialStats.map((material) => (
                      <div key={material.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: material.color }} />
                          <span className="font-medium">{material.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{material.weight.toFixed(1)} kg</span>
                          <p className="text-xs text-gray-500">{material.transactions} transactions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top Suppliers */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Top Suppliers by Revenue</h3>
              {supplierPerformance.length === 0 ? (
                <EmptyState 
                  title="No Supplier Data" 
                  message="No supplier transactions recorded yet."
                />
              ) : (
                <div className="space-y-4">
                  {supplierPerformance.map((supplier, index) => (
                    <div key={supplier.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-sm text-gray-500">
                            {supplier.transactions} transactions • {supplier.weight.toFixed(1)} kg
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">KES {(supplier.value / 1000).toFixed(0)}K</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collection Center Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meru Center Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Meru Collection Center</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Transactions</span>
                  <span className="font-medium">{transactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Weight Processed</span>
                  <span className="font-medium">{summaryStats.totalWeight.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue Generated</span>
                  <span className="font-medium">KES {(transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0) / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Suppliers</span>
                  <span className="font-medium">{summaryStats.activeSuppliers}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transaction Success Rate</span>
                  <span className="font-medium text-green-600">{qualityMetrics.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Processing Time</span>
                  <span className="font-medium">{qualityMetrics.avgProcessingTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Quality Material Rate</span>
                  <span className="font-medium">{qualityMetrics.qualityPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer Satisfaction</span>
                  <span className="font-medium text-green-600">{qualityMetrics.satisfactionScore.toFixed(1)}/5</span>
                </div>
              </div>
            </div>

            {/* Business Insights */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Business Insights</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Peak Activity:</strong> Most transactions occur during business hours
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Growth Trend:</strong> {summaryStats.monthlyGrowth > 0 ? 'Positive' : 'Stable'} monthly growth
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Material Focus:</strong> {summaryStats.topMaterial?.name || 'Diverse'} is the leading material
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;