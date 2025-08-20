// src/components/reports/CustomReport.tsx - Updated with Sales Transaction Integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2, Filter, Download, RefreshCw, BarChart3, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';

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

interface CustomReportProps {
  // Optional props - component will fetch its own data
}

interface GroupedData {
  key: string;
  purchases: number;
  sales: number;
  purchaseRevenue: number;
  salesRevenue: number;
  netProfit: number;
  weight: number;
  materials: Set<string>;
  suppliers: Set<string>;
  avgPrice: number;
  materialCount: number;
  supplierCount: number;
  margin: number;
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8 sm:py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-4" />
      <p className="text-gray-600 text-sm sm:text-base">Loading report data...</p>
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
const EmptyState = () => (
  <div className="text-center py-8 sm:py-12">
    <div className="bg-gray-100 rounded-full p-4 sm:p-6 w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
      <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto" />
    </div>
    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Data Found</h3>
    <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
      No transactions match your current filter criteria. Try adjusting your filters or date range.
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
      <p className="text-xs sm:text-sm text-blue-800">
        • Expand your date range<br/>
        • Clear material or supplier filters<br/>
        • Check if data exists for the selected period
      </p>
    </div>
  </div>
);

// Mobile-first stats card component
const CustomStatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  bgColor, 
  textColor
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ComponentType<any>; 
  bgColor: string; 
  textColor: string;
}) => (
  <div className={`${bgColor} p-3 sm:p-4 rounded-lg w-full`}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <h3 className={`text-xs sm:text-sm font-medium ${textColor} opacity-80`}>{title}</h3>
        <p className={`text-lg sm:text-2xl font-bold ${textColor} mt-1 truncate`}>{value}</p>
        <p className={`text-xs ${textColor} opacity-70 mt-1`}>{subtitle}</p>
      </div>
      <div className="ml-2 shrink-0">
        <Icon size={20} className={`${textColor} sm:w-6 sm:h-6`} />
      </div>
    </div>
  </div>
);

const CustomReport: React.FC<CustomReportProps> = () => {
  const [purchaseTransactions, setPurchaseTransactions] = useState<PurchaseTransaction[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'material' | 'supplier'>('day');

  // Fetch all data from Supabase
  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch purchase transactions
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (purchaseError) {
        throw new Error(`Error fetching purchase transactions: ${purchaseError.message}`);
      }

      // Fetch sales transactions
      const { data: salesData, error: salesError } = await supabase
        .from('sales_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) {
        throw new Error(`Error fetching sales transactions: ${salesError.message}`);
      }

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      if (suppliersError) {
        throw new Error(`Error fetching suppliers: ${suppliersError.message}`);
      }

      // Extract unique materials from both transaction types
      const purchaseMaterials = (purchaseData || []).map(t => t.material_type).filter(Boolean);
      const salesMaterials = (salesData || []).map(t => t.material_name).filter(Boolean);
      const allMaterials = [...new Set([...purchaseMaterials, ...salesMaterials])].sort();

      setPurchaseTransactions(purchaseData || []);
      setSalesTransactions(salesData || []);
      setSuppliers(suppliersData || []);
      setAvailableMaterials(allMaterials);

    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchReportData();
    setIsRefreshing(false);
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

  // Get unique supplier names from unified transactions
  const supplierNames = [...new Set(unifiedTransactions.map(t => t.customer_name))].filter(Boolean).sort();

  // Filter transactions based on criteria
  const filteredTransactions = unifiedTransactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999); // Include entire end date
    
    const dateMatch = transactionDate >= startDate && transactionDate <= endDate;
    const materialMatch = selectedMaterials.length === 0 || selectedMaterials.includes(t.material_type);
    const supplierMatch = selectedSuppliers.length === 0 || selectedSuppliers.includes(t.customer_name);
    const typeMatch = selectedTransactionTypes.length === 0 || selectedTransactionTypes.includes(t.type);
    
    return dateMatch && materialMatch && supplierMatch && typeMatch;
  });

  // Calculate stats from filtered transactions
  const purchases = filteredTransactions.filter(t => t.type === 'purchase');
  const sales = filteredTransactions.filter(t => t.type === 'sale');
  
  const purchaseRevenue = purchases.reduce((sum, t) => sum + t.total_amount, 0);
  const salesRevenue = sales.reduce((sum, t) => sum + t.total_amount, 0);
  const netProfit = salesRevenue - purchaseRevenue;
  const totalWeight = filteredTransactions.reduce((sum, t) => sum + t.weight_kg, 0);
  const avgPricePerKg = totalWeight > 0 ? (purchaseRevenue + salesRevenue) / totalWeight : 0;

  // Group data based on selection
  const groupedData = React.useMemo(() => {
    const groups: Record<string, any> = {};

    filteredTransactions.forEach(transaction => {
      let key: string;
      const date = new Date(transaction.transaction_date);

      switch (groupBy) {
        case 'day':
          key = date.toLocaleDateString();
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = `Week of ${weekStart.toLocaleDateString()}`;
          break;
        case 'month':
          key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          break;
        case 'material':
          key = transaction.material_type;
          break;
        case 'supplier':
          key = transaction.customer_name;
          break;
        default:
          key = 'Unknown';
      }

      if (!groups[key]) {
        groups[key] = {
          purchases: 0,
          sales: 0,
          purchaseRevenue: 0,
          salesRevenue: 0,
          weight: 0,
          materials: new Set(),
          suppliers: new Set()
        };
      }

      if (transaction.type === 'purchase') {
        groups[key].purchases++;
        groups[key].purchaseRevenue += transaction.total_amount;
      } else {
        groups[key].sales++;
        groups[key].salesRevenue += transaction.total_amount;
      }
      
      groups[key].weight += transaction.weight_kg;
      groups[key].materials.add(transaction.material_type);
      groups[key].suppliers.add(transaction.customer_name);
    });

    return Object.entries(groups).map(([key, data]) => ({
      key,
      ...data,
      netProfit: data.salesRevenue - data.purchaseRevenue,
      avgPrice: data.weight > 0 ? (data.purchaseRevenue + data.salesRevenue) / data.weight : 0,
      materialCount: data.materials.size,
      supplierCount: data.suppliers.size,
      margin: data.salesRevenue > 0 ? ((data.salesRevenue - data.purchaseRevenue) / data.salesRevenue) * 100 : 0
    }));
  }, [filteredTransactions, groupBy]);

  // Handle filter changes
  const handleMaterialToggle = (material: string) => {
    setSelectedMaterials(prev =>
      prev.includes(material)
        ? prev.filter(m => m !== material)
        : [...prev, material]
    );
  };

  const handleSupplierToggle = (supplier: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplier)
        ? prev.filter(s => s !== supplier)
        : [...prev, supplier]
    );
  };

  const handleTransactionTypeToggle = (type: string) => {
    setSelectedTransactionTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedMaterials([]);
    setSelectedSuppliers([]);
    setSelectedTransactionTypes([]);
    setDateRange({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      groupBy === 'day' ? 'Date' : 
      groupBy === 'week' ? 'Week' :
      groupBy === 'month' ? 'Month' :
      groupBy === 'material' ? 'Material' : 'Supplier',
      'Purchases',
      'Sales',
      'Purchase Revenue',
      'Sales Revenue',
      'Net Profit',
      'Weight (kg)',
      'Avg Price/kg',
      'Margin %'
    ];

    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      headers.push('Materials', 'Suppliers');
    }

    const csvContent = [
      headers.join(','),
      ...groupedData.map(group => {
        const baseRow = [
          group.key,
          group.purchases,
          group.sales,
          group.purchaseRevenue.toFixed(2),
          group.salesRevenue.toFixed(2),
          group.netProfit.toFixed(2),
          group.weight.toFixed(1),
          group.avgPrice.toFixed(2),
          group.margin.toFixed(1)
        ];

        if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
          baseRow.push(group.materialCount.toString(), group.supplierCount.toString());
        }

        return baseRow.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `custom_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Load data on component mount
  useEffect(() => {
    fetchReportData();
  }, []);

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
          <ErrorDisplay error={error} onRetry={fetchReportData} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Custom Report</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Filters</span>
            </button>
          </div>
        </div>

        {/* Data source indicator */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800">
            ✓ Using {purchaseTransactions.length} purchases and {salesTransactions.length} sales ({filteredTransactions.length} matching filters)
          </p>
        </div>

        {/* Filters - Mobile First */}
        <div className="mb-4 sm:mb-6 space-y-4">
          {/* Date Range and Group By */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="material">Material</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
          </div>

          {/* Transaction Types Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Types ({selectedTransactionTypes.length === 0 ? 'All' : selectedTransactionTypes.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {['purchase', 'sale'].map(type => (
                <button
                  key={type}
                  onClick={() => handleTransactionTypeToggle(type)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTransactionTypes.includes(type)
                      ? type === 'purchase' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type === 'purchase' ? (
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft size={14} />
                      Purchase
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <ArrowUpRight size={14} />
                      Sale
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Materials Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Materials ({selectedMaterials.length === 0 ? 'All' : selectedMaterials.length} selected)
            </label>
            {availableMaterials.length === 0 ? (
              <p className="text-gray-500 text-sm">No materials found in database</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md">
                {availableMaterials.map(material => (
                  <button
                    key={material}
                    onClick={() => handleMaterialToggle(material)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                      selectedMaterials.includes(material)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {material}
                    {selectedMaterials.includes(material) && (
                      <X size={12} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Suppliers Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Partners ({selectedSuppliers.length === 0 ? 'All' : selectedSuppliers.length} selected)
            </label>
            {supplierNames.length === 0 ? (
              <p className="text-gray-500 text-sm">No partners found in current data</p>
            ) : (
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                <div className="flex flex-wrap gap-2">
                  {supplierNames.map(supplier => (
                    <button
                      key={supplier}
                      onClick={() => handleSupplierToggle(supplier)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                        selectedSuppliers.includes(supplier)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {supplier}
                      {selectedSuppliers.includes(supplier) && (
                        <X size={12} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats - Mobile First Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <CustomStatsCard 
            title="Purchases"
            value={purchases.length.toString()}
            subtitle="Transactions"
            icon={ArrowDownLeft}
            bgColor="bg-blue-50"
            textColor="text-blue-900"
          />
          <CustomStatsCard 
            title="Sales"
            value={sales.length.toString()}
            subtitle="Transactions"
            icon={ArrowUpRight}
            bgColor="bg-green-50"
            textColor="text-green-900"
          />
          <CustomStatsCard 
            title="Purchase Cost"
            value={`${(purchaseRevenue / 1000).toFixed(1)}K`}
            subtitle="KES spent"
            icon={DollarSign}
            bgColor="bg-red-50"
            textColor="text-red-900"
          />
          <CustomStatsCard 
            title="Sales Revenue"
            value={`${(salesRevenue / 1000).toFixed(1)}K`}
            subtitle="KES earned"
            icon={DollarSign}
            bgColor="bg-green-50"
            textColor="text-green-900"
          />
          <CustomStatsCard 
            title="Net Profit"
            value={`${(netProfit / 1000).toFixed(1)}K`}
            subtitle={netProfit >= 0 ? "Profit" : "Loss"}
            icon={TrendingUp}
            bgColor={netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}
            textColor={netProfit >= 0 ? "text-emerald-900" : "text-red-900"}
          />
          <CustomStatsCard 
            title="Total Weight"
            value={`${totalWeight.toFixed(1)}`}
            subtitle="kg processed"
            icon={Package}
            bgColor="bg-purple-50"
            textColor="text-purple-900"
          />
        </div>

        {/* Results */}
        {filteredTransactions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Results Table */}
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Report Results</h3>
                <div className="flex items-center gap-4">
                  <div className="text-xs sm:text-sm text-gray-600">
                    {groupedData.length} {groupBy === 'day' ? 'days' : groupBy === 'week' ? 'weeks' : groupBy === 'month' ? 'months' : groupBy === 'material' ? 'materials' : 'partners'} found
                  </div>
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Export CSV</span>
                    <span className="sm:hidden">Export</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {groupBy === 'day' ? 'Date' : 
                         groupBy === 'week' ? 'Week' :
                         groupBy === 'month' ? 'Month' :
                         groupBy === 'material' ? 'Material' : 'Partner'}
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Profit</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                      {(groupBy === 'day' || groupBy === 'week' || groupBy === 'month') && (
                        <>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Materials</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Partners</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedData
                      .sort((a, b) => {
                        if (groupBy === 'material' || groupBy === 'supplier') {
                          return b.netProfit - a.netProfit;
                        }
                        return a.key.localeCompare(b.key);
                      })
                      .map((group, index) => (
                        <tr key={group.key} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                            <div className="max-w-[120px] sm:max-w-none truncate" title={group.key}>
                              {group.key}
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                            <div>
                              <div>{group.purchases} tx</div>
                              <div className="text-red-600 font-medium">KES {group.purchaseRevenue.toLocaleString()}</div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                            <div>
                              <div>{group.sales} tx</div>
                              <div className="text-green-600 font-medium">KES {group.salesRevenue.toLocaleString()}</div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                            <div className={`font-medium ${group.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {group.netProfit >= 0 ? '+' : ''}KES {group.netProfit.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {group.margin.toFixed(1)}% margin
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{group.weight.toFixed(1)}</td>
                          {(groupBy === 'day' || groupBy === 'week' || groupBy === 'month') && (
                            <>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{group.materialCount}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{group.supplierCount}</td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomReport;