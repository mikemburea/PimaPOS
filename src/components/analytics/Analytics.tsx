// src/components/analytics/Analytics.tsx - Fixed to pull real data from database
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Package, DollarSign, Users, AlertTriangle, Loader2, Calendar, Scale, Target } from 'lucide-react';

// Updated interfaces to match new database structure
// Updated interfaces to match new database structure
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
  updated_at?: string | null;
  contact_person?: string | null;
  website?: string | null;
  notes?: string | null;
  supplier_tier: string;
  credit_limit: number;
  preferred_payment_method: string;
  total_weight: number;
  first_transaction_date?: string | null;
  last_transaction_date?: string | null;
  average_transaction_value: number;
  registration_reason?: string | null;
  registered_date: string;
  registered_by?: string | null;
}


interface Material {
  id: number;
  name: string;
  category?: string | null;
  current_price_per_kg: number;
  is_active: boolean;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
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
  avgPrice: number;
  marketShare: number;
}

interface SupplierPerformance {
  id: string;
  name: string;
  revenue: number;
  transactions: number;
  weight: number;
  avgTransactionValue: number;
  avgPricePerKg: number;
  lastTransactionDate: string;
  firstTransactionDate: string;
  totalMaterials: number;
  tier: string;
  creditLimit: number;
  preferredPaymentMethod: string;
  materialTypes: string[];
  registrationDate: string;
  daysSinceFirstTransaction: number;
  transactionFrequency: number;
}

interface AnalyticsProps {
  salesTransactions?: SalesTransaction[];
  suppliers?: Supplier[];
  materials?: Material[];
}

// Color palette for charts
const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#EF4444', '#64748B'];

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
  salesTransactions: propSalesTransactions, 
  suppliers: propSuppliers, 
  materials: propMaterials 
}) => {
  // State management
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Supabase - ALWAYS fetch, don't rely on props
  const fetchAnalyticsData = async () => {
    try {
      console.log('📊 Analytics: Starting data fetch...');
      setLoading(true);
      setError(null);

      // Fetch all data in parallel - Focus on purchase transactions (incoming materials from suppliers)
      const [transactionsResult, suppliersResult, materialsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false }),
        supabase
          .from('suppliers')
          .select('*')
          .order('total_value', { ascending: false }),
        supabase
          .from('materials')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })
      ]);

      // Check for errors
      if (transactionsResult.error) {
        console.error('❌ Transactions error:', transactionsResult.error);
        throw transactionsResult.error;
      }
      if (suppliersResult.error) {
        console.error('❌ Suppliers error:', suppliersResult.error);
        throw suppliersResult.error;
      }
      if (materialsResult.error) {
        console.error('❌ Materials error:', materialsResult.error);
        throw materialsResult.error;
      }

      const fetchedTransactions = transactionsResult.data || [];
      const fetchedSuppliers = suppliersResult.data || [];
      const fetchedMaterials = materialsResult.data || [];

      console.log('✅ Analytics: Data fetched successfully');
      console.log('📊 Purchase transactions:', fetchedTransactions.length);
      console.log('🏪 Suppliers:', fetchedSuppliers.length);
      console.log('📦 Materials:', fetchedMaterials.length);

   // Log sample data for debugging
      if (fetchedTransactions.length > 0) {
        console.log('Sample transaction:', fetchedTransactions[0]);
        console.log('Material name from transaction:', fetchedTransactions[0].name);
        console.log('First 3 transaction names:', fetchedTransactions.slice(0, 3).map(t => t.name));
      }
      if (fetchedSuppliers.length > 0) {
        console.log('Sample supplier:', fetchedSuppliers[0]);
      }
    // NEW CODE:
if (fetchedMaterials.length > 0) {
  console.log('Sample material:', fetchedMaterials[0]);
  console.log('Material ID type:', typeof fetchedMaterials[0].id);
  console.log('Material ID from transaction:', fetchedTransactions[0]?.material_id);
}
  // Transform transactions to match SalesTransaction interface
      // Use 'material_type' field which contains material names like CAST, SECTION, BRASS
      const normalizedTransactions = fetchedTransactions.map(t => {
        // material_type is the correct field in the database
        const materialName = t.material_type || 'Unknown Material';
        
        return {
          id: t.id,
          transaction_id: t.transaction_id || t.id,
          supplier_id: t.supplier_id,
          supplier_name: t.supplier_name,
          material_id: t.material_id || null,
          material_name: materialName, // Uses t.material_type (CAST, SECTION, BRASS, etc.)
          weight_kg: Number(t.weight_kg) || 0,
          price_per_kg: Number(t.unit_price) || 0,
          total_amount: Number(t.total_amount) || 0,
          transaction_date: t.transaction_date,
          notes: t.notes || null,
          is_special_price: t.is_special_price || false,
          original_price: t.original_price || null,
          payment_method: t.payment_method || 'cash',
          payment_status: t.payment_status || 'pending',
          transaction_type: 'purchase',
          created_by: t.created_by || null,
          created_at: t.created_at,
          updated_at: t.updated_at || null
        };
      }) as SalesTransaction[];

      console.log('📊 Normalized transactions for analytics:', normalizedTransactions.length);
      console.log('✅ Payment status breakdown:', {
        completed: normalizedTransactions.filter(t => t.payment_status === 'completed').length,
        pending: normalizedTransactions.filter(t => t.payment_status === 'pending').length,
        partial: normalizedTransactions.filter(t => t.payment_status === 'partial').length
      });

      setSalesTransactions(normalizedTransactions);
      setSuppliers(fetchedSuppliers);
      setMaterials(fetchedMaterials);

    } catch (err) {
      console.error('❌ Error fetching analytics data:', err);
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
    const activeMaterials = materials.filter(m => m.is_active);

    return months.map((month, index) => {
      const monthData: MonthlyData = { month };
      
      activeMaterials.forEach(material => {
    // NEW CODE:
const monthTransactions = salesTransactions.filter(t => {
  const transactionDate = new Date(t.transaction_date);
  // Match by ID first (most reliable), fallback to name
  const materialMatches = t.material_id 
    ? t.material_id === material.id 
    : t.material_name.toUpperCase() === material.name.toUpperCase();
  
  return transactionDate.getMonth() === index && 
         transactionDate.getFullYear() === currentYear &&
         materialMatches &&
         t.payment_status === 'completed';
});

        const totalWeight = monthTransactions.reduce((sum, t) => sum + t.weight_kg, 0);
        const totalRevenue = monthTransactions.reduce((sum, t) => sum + t.total_amount, 0);
        
        monthData[material.name] = totalWeight;
        monthData[`${material.name}_revenue`] = totalRevenue;
      });

      return monthData;
    });
  };

  // Calculate material distribution with real database data
// Calculate material distribution with real database data
const calculateMaterialStats = (): MaterialStats[] => {
  const materialStatsMap = new Map<string, MaterialStats>();
  const completedTransactions = salesTransactions.filter(t => t.payment_status === 'completed');
  const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  
  console.log('🔍 Calculating material stats from', completedTransactions.length, 'completed transactions');
  console.log('📋 Available materials in DB:', materials.map(m => `"${m.name}" (ID: ${m.id})`).join(', '));
  
  // Populate with actual transaction data (transactions are the source of truth)
  completedTransactions.forEach((transaction, idx) => {
    const materialName = transaction.material_name || 'Unknown Material';
    
    console.log(`🔎 Txn #${idx + 1}: name="${materialName}", material_id=${transaction.material_id}`);
    
   if (!materialStatsMap.has(materialName)) {
  // Find matching material from database by ID (most reliable), then by name
  // TRIM whitespace from both sides for comparison
  const dbMaterial = transaction.material_id 
    ? materials.find(m => m.id === transaction.material_id)
    : materials.find(m => m.name.trim().toUpperCase() === materialName.trim().toUpperCase());
  
  const colorIndex = materialStatsMap.size;
  
  // Log matching results
  if (dbMaterial) {
    console.log(`  ✅ MATCHED by ${transaction.material_id ? 'ID' : 'name'} → DB material: "${dbMaterial.name}" (price: KES ${dbMaterial.current_price_per_kg}/kg)`);
  } else {
    console.log(`  ⚠️ NO MATCH - using txn price: KES ${transaction.price_per_kg}/kg`);
  }
      
      materialStatsMap.set(materialName, {
        name: materialName,
        value: 0,
        color: COLORS[colorIndex % COLORS.length],
        weight: 0,
        transactions: 0,
        revenue: 0,
        avgPrice: dbMaterial?.current_price_per_kg || transaction.price_per_kg,
        marketShare: 0
      });
    }
    
    const materialStats = materialStatsMap.get(materialName)!;
    materialStats.weight += Number(transaction.weight_kg) || 0;
    materialStats.revenue += Number(transaction.total_amount) || 0;
    materialStats.transactions += 1;
    materialStats.value = materialStats.weight;
    
    // Calculate actual average price from transactions
    if (materialStats.weight > 0) {
      materialStats.avgPrice = materialStats.revenue / materialStats.weight;
    }
  });

  // Calculate market share
  materialStatsMap.forEach(material => {
    material.marketShare = totalRevenue > 0 ? (material.revenue / totalRevenue) * 100 : 0;
  });

  const result = Array.from(materialStatsMap.values())
    .filter(material => material.transactions > 0)
    .sort((a, b) => b.weight - a.weight);
  
  console.log('📊 Material stats calculated:', result.length, 'materials with transactions');
  if (result.length > 0) {
    console.log('Top material:', result[0].name, '-', result[0].weight.toFixed(2), 'kg');
  }
  
  return result;
};

  // Calculate supplier performance with actual transaction data
  const calculateSupplierPerformance = (): SupplierPerformance[] => {
    console.log('🔍 Calculating supplier performance...');
    
    const activeSuppliers = suppliers.filter(supplier => supplier.status === 'active');
    console.log('Active suppliers:', activeSuppliers.length);
    
    // Calculate actual metrics from transactions for each supplier
    const supplierMetrics = activeSuppliers.map(supplier => {
      // Get all completed transactions for this supplier
      const supplierTransactions = salesTransactions.filter(t => 
        t.supplier_id === supplier.id && t.payment_status === 'completed'
      );
      
      const transactionCount = supplierTransactions.length;
      const totalRevenue = supplierTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const totalWeight = supplierTransactions.reduce((sum, t) => sum + Number(t.weight_kg), 0);
      const avgTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
      const avgPricePerKg = totalWeight > 0 ? totalRevenue / totalWeight : 0;
      
      // Get unique materials
      const uniqueMaterials = new Set(supplierTransactions.map(t => t.material_name));
      
      // Calculate dates
      const sortedTransactions = supplierTransactions
        .map(t => new Date(t.transaction_date))
        .sort((a, b) => a.getTime() - b.getTime());
      
      const firstTransactionDate = sortedTransactions.length > 0 ? 
        sortedTransactions[0].toISOString() : supplier.registered_date;
      const lastTransactionDate = sortedTransactions.length > 0 ? 
        sortedTransactions[sortedTransactions.length - 1].toISOString() : '';
      
      const daysSinceFirst = sortedTransactions.length > 0 ? 
        Math.floor((new Date().getTime() - sortedTransactions[0].getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      const monthsSinceFirst = Math.max(1, daysSinceFirst / 30);
      const transactionFrequency = transactionCount / monthsSinceFirst;

      return {
        id: supplier.id,
        name: supplier.name,
        revenue: totalRevenue,
        transactions: transactionCount,
        weight: totalWeight,
        avgTransactionValue: avgTransactionValue,
        avgPricePerKg: avgPricePerKg,
        lastTransactionDate: lastTransactionDate,
        firstTransactionDate: firstTransactionDate,
        totalMaterials: uniqueMaterials.size,
        tier: supplier.supplier_tier,
        creditLimit: supplier.credit_limit,
        preferredPaymentMethod: supplier.preferred_payment_method,
        materialTypes: Array.from(uniqueMaterials),
        registrationDate: supplier.registered_date,
        daysSinceFirstTransaction: daysSinceFirst,
        transactionFrequency: transactionFrequency
      };
    });
    
    // Filter suppliers with transactions and sort by revenue
    const result = supplierMetrics
      .filter(s => s.transactions > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    console.log('📊 Supplier performance calculated:', result.length, 'suppliers with transactions');
    if (result.length > 0) {
      console.log('Top supplier:', result[0].name, '- KES', result[0].revenue.toFixed(2));
    }
    
    return result;
  };

  // Calculate comprehensive summary statistics from actual transactions
  const calculateSummaryStats = () => {
    const completedTransactions = salesTransactions.filter(t => t.payment_status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
    const totalWeight = completedTransactions.reduce((sum, t) => sum + Number(t.weight_kg), 0);
    
    console.log('📊 Summary stats: ', completedTransactions.length, 'completed transactions');
    console.log('💰 Total revenue: KES', totalRevenue.toFixed(2));
    console.log('⚖️ Total weight:', totalWeight.toFixed(2), 'kg');
    
    const avgTransactionValue = completedTransactions.length > 0 ? totalRevenue / completedTransactions.length : 0;
    const avgPricePerKg = totalWeight > 0 ? totalRevenue / totalWeight : 0;
    
    const materialStats = calculateMaterialStats();
    const topMaterialByRevenue = materialStats.length > 0 ? materialStats.reduce((max, material) => 
      material.revenue > max.revenue ? material : max, materialStats[0]
    ) : null;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const recentTransactions = salesTransactions.filter(t => 
      new Date(t.transaction_date) >= thirtyDaysAgo && t.payment_status === 'completed'
    );
    const previousTransactions = salesTransactions.filter(t => 
      new Date(t.transaction_date) >= sixtyDaysAgo && 
      new Date(t.transaction_date) < thirtyDaysAgo &&
      t.payment_status === 'completed'
    );
    
    const recentRevenue = recentTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
    const previousRevenue = previousTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
    
    const monthlyGrowth = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    // Calculate supplier stats from actual transactions
    const suppliersWithTransactions = new Set(
      completedTransactions.map(t => t.supplier_id).filter(id => id)
    );
    const activeSuppliersWithTransactions = suppliersWithTransactions.size;
    
    const allSuppliers = suppliers || [];
    const activeSuppliers = allSuppliers.filter(s => s.status === 'active').length;
    
    // Calculate unique materials from actual transactions
    const activeMaterials = new Set(completedTransactions.map(t => t.material_name)).size;
    
    const specialPriceTransactions = completedTransactions.filter(t => t.is_special_price).length;
    const specialPricePercentage = completedTransactions.length > 0 ? 
      (specialPriceTransactions / completedTransactions.length) * 100 : 0;
    
    const totalCreditLimit = allSuppliers.reduce((sum, s) => sum + (s.credit_limit || 0), 0);
    
    console.log('✅ Summary calculated - Active suppliers with txns:', activeSuppliersWithTransactions, '/', activeSuppliers);
    
    return {
      totalRevenue,
      totalWeight,
      avgTransactionValue,
      avgPricePerKg,
      topMaterialByRevenue,
      monthlyGrowth,
      activeSuppliers,
      activeSuppliersWithTransactions,
      activeMaterials,
      totalTransactions: completedTransactions.length,
      specialPricePercentage,
      recentTransactions: recentTransactions.length,
      previousTransactions: previousTransactions.length,
      totalCreditLimit
    };
  };

  // Calculate supplier tier distribution
  const calculateSupplierTierStats = () => {
    const allSuppliers = suppliers || [];
    
    const tierCounts = allSuppliers.reduce((acc, supplier) => {
      const tier = supplier.supplier_tier || 'occasional';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tierRevenue = allSuppliers.reduce((acc, supplier) => {
      const tier = supplier.supplier_tier || 'occasional';
      acc[tier] = (acc[tier] || 0) + supplier.total_value;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(tierCounts).map(tier => ({
      tier,
      count: tierCounts[tier],
      revenue: tierRevenue[tier],
      percentage: allSuppliers.length > 0 ? (tierCounts[tier] / allSuppliers.length) * 100 : 0
    }));
  };

  // Calculate payment method distribution
  const calculatePaymentMethodStats = () => {
    const allSuppliers = suppliers || [];
    
    const methodCounts = allSuppliers.reduce((acc, supplier) => {
      const method = supplier.preferred_payment_method || 'cash';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(methodCounts).map(method => ({
      method,
      count: methodCounts[method],
      percentage: allSuppliers.length > 0 ? (methodCounts[method] / allSuppliers.length) * 100 : 0
    }));
  };

  // Calculate supplier registration trends
  const calculateRegistrationTrends = () => {
    const allSuppliers = suppliers || [];
    
    const monthlyRegistrations = allSuppliers.reduce((acc, supplier) => {
      const month = new Date(supplier.registered_date).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(monthlyRegistrations)
      .sort()
      .slice(-12)
      .map(month => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        registrations: monthlyRegistrations[month]
      }));
  };

  // Calculate performance metrics
  const calculatePerformanceMetrics = () => {
    const totalTransactions = salesTransactions.length;
    const completedTransactions = salesTransactions.filter(t => t.payment_status === 'completed');
    
    const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;
    const avgProcessingTime = '< 1 hour';
    
   // NEW CODE:
const priceVariances = materials.map(material => {
  // Match transactions by ID first (most reliable), fallback to name
  const materialTransactions = completedTransactions.filter(t => 
    t.material_id 
      ? t.material_id === material.id 
      : t.material_name.toUpperCase() === material.name.toUpperCase()
  );
  if (materialTransactions.length === 0) return { material: material.name, variance: 0 };
      
      const avgActualPrice = materialTransactions.reduce((sum, t) => sum + t.price_per_kg, 0) / materialTransactions.length;
      const variance = Math.abs(avgActualPrice - material.current_price_per_kg) / material.current_price_per_kg * 100;
      
      return { material: material.name, variance };
    });
    
    const avgPriceVariance = priceVariances.length > 0 ? 
      priceVariances.reduce((sum, pv) => sum + pv.variance, 0) / priceVariances.length : 0;
    
    const uniqueMaterials = new Set(completedTransactions.map(t => t.material_name)).size;
    const totalMaterials = materials.filter(m => m.is_active).length;
    const diversityScore = totalMaterials > 0 ? (uniqueMaterials / totalMaterials) * 100 : 0;
    
    return {
      successRate,
      avgProcessingTime,
      avgPriceVariance,
      diversityScore,
      uniqueMaterials,
      totalMaterials
    };
  };

  // Fetch data on mount
  useEffect(() => {
    console.log('🚀 Analytics: Component mounted, fetching data...');
    fetchAnalyticsData();
  }, []); // Empty dependency array - only run on mount

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-2">Comprehensive business insights and performance metrics</p>
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
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-2">Comprehensive business insights and performance metrics</p>
        </div>
        <ErrorDisplay error={error} onRetry={fetchAnalyticsData} />
      </div>
    );
  }

  // Check if we have data
  const hasData = salesTransactions.length > 0 || suppliers.length > 0;

  // Calculate all statistics
  const monthlyData = calculateMonthlyData();
  const materialStats = calculateMaterialStats();
  const supplierPerformance = calculateSupplierPerformance();
  const summaryStats = calculateSummaryStats();
  const performanceMetrics = calculatePerformanceMetrics();
  const supplierTierStats = calculateSupplierTierStats();
  const paymentMethodStats = calculatePaymentMethodStats();
  const registrationTrends = calculateRegistrationTrends();

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Enhanced Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
        <p className="text-gray-600 mt-2">
          Comprehensive business insights for Meru Collection Center • 
          Last updated: {new Date().toLocaleString('en-US', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
          })}
        </p>
        {hasData && (
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            <span>📊 {summaryStats.totalTransactions} transactions analyzed</span>
            <span>⚖️ {summaryStats.totalWeight.toFixed(1)} kg processed</span>
            <span>🏪 {summaryStats.activeSuppliersWithTransactions}/{summaryStats.activeSuppliers} active suppliers</span>
            <span>💰 KES {(summaryStats.totalCreditLimit / 1000).toFixed(0)}K credit extended</span>
            <span>📈 {performanceMetrics.uniqueMaterials}/{performanceMetrics.totalMaterials} materials traded</span>
          </div>
        )}
      </div>

      {!hasData ? (
        <EmptyState 
          title="No Data Available" 
          message="Start recording transactions and adding suppliers to see detailed analytics and insights about your scrap metal business performance."
        />
      ) : (
        <>
          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
                  <p className="text-2xl font-bold text-green-600">
                    KES {summaryStats.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 mt-2 flex items-center">
                    {summaryStats.monthlyGrowth >= 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {summaryStats.monthlyGrowth > 0 ? '+' : ''}{summaryStats.monthlyGrowth.toFixed(1)}% vs last month
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Average Price/kg</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    KES {summaryStats.avgPricePerKg.toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {summaryStats.activeMaterials} active materials
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Scale className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Top Material</h3>
                  <p className="text-lg font-bold text-purple-600">
                    {summaryStats.topMaterialByRevenue?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    KES {summaryStats.topMaterialByRevenue?.revenue.toLocaleString() || '0'} revenue
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Active Suppliers</h3>
                  <p className="text-2xl font-bold text-orange-600">
                    {summaryStats.activeSuppliersWithTransactions}/{summaryStats.activeSuppliers}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {summaryStats.activeSuppliersWithTransactions} with transactions
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Material Collection Trends Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Material Collection Trends (Weight in kg)</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Current Year: {new Date().getFullYear()}</span>
              </div>
            </div>
            {materialStats.length === 0 ? (
              <EmptyState 
                title="No Material Data" 
                message="No materials have been processed yet. Add materials to see collection trends."
              />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [`${value} kg`, name]}
                    labelFormatter={(month) => `Month: ${month}`}
                  />
                  <Legend />
                  {materialStats.map((material, index) => (
                    <Area 
                      key={material.name} 
                      dataKey={material.name} 
                      stackId="1"
                      fill={material.color}
                      stroke={material.color}
                      name={material.name}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Material Distribution and Supplier Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Material Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Material Distribution by Weight</h3>
                <span className="text-sm text-gray-500">
                  {materialStats.length} materials processed
                </span>
              </div>
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
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toFixed(1)} kg`, 'Weight']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                    {materialStats.map((material) => (
                      <div key={material.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: material.color }} />
                          <div>
                            <span className="font-medium">{material.name}</span>
                            <p className="text-xs text-gray-500">
                              {material.marketShare.toFixed(1)}% market share
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{material.weight.toFixed(1)} kg</span>
                          <p className="text-xs text-gray-500">
                            {material.transactions} transactions • KES {material.avgPrice.toFixed(0)}/kg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Enhanced Supplier Performance */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Top Suppliers by Revenue</h3>
                <span className="text-sm text-gray-500">
                  Top {Math.min(supplierPerformance.length, 10)} suppliers
                </span>
              </div>
              {supplierPerformance.length === 0 ? (
                <EmptyState 
                  title="No Supplier Data" 
                  message="No supplier transactions recorded yet."
                />
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {supplierPerformance.map((supplier, index) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{supplier.name}</p>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              supplier.tier === 'strategic' ? 'bg-purple-100 text-purple-700' :
                              supplier.tier === 'regular' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {supplier.tier}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {supplier.transactions} transactions • {supplier.weight.toFixed(1)} kg
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{supplier.totalMaterials} materials</span>
                            <span>{supplier.preferredPaymentMethod}</span>
                            <span>{supplier.transactionFrequency.toFixed(1)}/month</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Credit: KES {supplier.creditLimit.toLocaleString()} • 
                            Last: {supplier.lastTransactionDate ? new Date(supplier.lastTransactionDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">KES {(supplier.revenue / 1000).toFixed(0)}K</p>
                        <p className="text-sm text-gray-500">
                          KES {supplier.avgPricePerKg.toFixed(0)}/kg avg
                        </p>
                        <p className="text-xs text-gray-400">
                          KES {(supplier.avgTransactionValue / 1000).toFixed(1)}K avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Business Intelligence Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Meru Center Performance */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Center Performance</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-medium text-green-600">{performanceMetrics.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Processing Time</span>
                  <span className="font-medium">{performanceMetrics.avgProcessingTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Material Diversity</span>
                  <span className="font-medium">{performanceMetrics.diversityScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Special Pricing</span>
                  <span className="font-medium text-orange-600">{summaryStats.specialPricePercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Market Analysis */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Market Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Price Variance</span>
                  <span className="font-medium">{performanceMetrics.avgPriceVariance.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Volume</span>
                  <span className="font-medium">{summaryStats.totalWeight.toFixed(0)} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Transaction</span>
                  <span className="font-medium">KES {summaryStats.avgTransactionValue.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Credit Extended</span>
                  <span className="font-medium text-blue-600">KES {(summaryStats.totalCreditLimit / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>

            {/* Supplier Insights */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Supplier Insights</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Strategic Suppliers:</strong> {supplierTierStats.find(t => t.tier === 'strategic')?.count || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Regular Suppliers:</strong> {supplierTierStats.find(t => t.tier === 'regular')?.count || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Active Rate:</strong> {summaryStats.activeSuppliers > 0 ? 
                      ((summaryStats.activeSuppliersWithTransactions / summaryStats.activeSuppliers) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Operational Insights */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Peak Material:</strong> {summaryStats.topMaterialByRevenue?.name || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-800">
                    <strong>Efficiency:</strong> {performanceMetrics.successRate.toFixed(0)}% completion rate
                  </p>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <p className="text-sm text-pink-800">
                    <strong>Revenue/kg:</strong> KES {summaryStats.avgPricePerKg.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* New Comprehensive Supplier Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Supplier Tier Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Supplier Tier Distribution</h3>
              {supplierTierStats.length === 0 ? (
                <EmptyState title="No Supplier Tiers" message="No supplier tier data available." />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={supplierTierStats.map((tier, index) => ({
                          ...tier,
                          color: ['#8B5CF6', '#3B82F6', '#10B981'][index] || '#6B7280'
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {supplierTierStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#8B5CF6', '#3B82F6', '#10B981'][index] || '#6B7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} suppliers`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {supplierTierStats.map((tier, index) => (
                      <div key={tier.tier} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981'][index] || '#6B7280' }}
                          />
                          <span className="capitalize font-medium">{tier.tier}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{tier.count}</span>
                          <p className="text-xs text-gray-500">{tier.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Payment Method Preferences */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Method Preferences</h3>
              {paymentMethodStats.length === 0 ? (
                <EmptyState title="No Payment Data" message="No payment method data available." />
              ) : (
                <div className="space-y-3">
                  {paymentMethodStats.map((method, index) => (
                    <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          method.method === 'cash' ? 'bg-green-100 text-green-600' :
                          method.method === 'bank_transfer' ? 'bg-blue-100 text-blue-600' :
                          method.method === 'mobile_money' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{method.method.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-500">{method.percentage.toFixed(1)}% of suppliers</p>
                        </div>
                      </div>
                      <span className="font-semibold">{method.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supplier Registration Trends */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Supplier Registration Trends</h3>
              {registrationTrends.length === 0 ? (
                <EmptyState title="No Registration Data" message="No supplier registration trends available." />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={registrationTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => [`${value} registrations`, 'New Suppliers']} />
                    <Line 
                      type="monotone" 
                      dataKey="registrations" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;