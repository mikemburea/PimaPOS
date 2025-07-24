// src/components/reports/CustomReport.tsx - Fixed with proper props interface
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, DollarSign, Package, Users, AlertCircle, Loader2, Filter, Download, RefreshCw, BarChart3 } from 'lucide-react';

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

// FIXED: Updated CustomReportProps to match what App.tsx passes
interface CustomReportProps {
  transactions: ReportTransaction[];
}

interface GroupedData {
  key: string;
  transactions: number;
  revenue: number;
  weight: number;
  materials: Set<string>;
  suppliers: Set<string>;
  avgPrice: number;
  materialCount: number;
  supplierCount: number;
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading report data...</p>
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
const EmptyState = () => (
  <div className="text-center py-12">
    <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4">
      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Found</h3>
    <p className="text-gray-600 mb-6">
      No transactions match your current filter criteria. Try adjusting your filters or date range.
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
      <p className="text-sm text-blue-800">
        • Expand your date range<br/>
        • Clear material or supplier filters<br/>
        • Check if data exists for the selected period
      </p>
    </div>
  </div>
);

// FIXED: Updated component to use props from App.tsx
const CustomReport: React.FC<CustomReportProps> = ({ transactions }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'material' | 'supplier'>('day');

  // Fetch suppliers (we still need this for additional context)
  const fetchSuppliers = async () => {
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

    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchSuppliers();
    setIsRefreshing(false);
  };

  // Get unique materials and suppliers from prop transactions
  const materials = [...new Set(transactions.map(t => t.material))].filter(Boolean);
  const supplierNames = [...new Set(transactions.map(t => t.supplierName))].filter(Boolean);

  // Filter transactions based on criteria using prop transactions
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999); // Include entire end date
    
    const dateMatch = transactionDate >= startDate && transactionDate <= endDate;
    const materialMatch = selectedMaterials.length === 0 || selectedMaterials.includes(t.material);
    const supplierMatch = selectedSuppliers.length === 0 || selectedSuppliers.includes(t.supplierName);
    
    return dateMatch && materialMatch && supplierMatch;
  });

  // Calculate stats from filtered prop transactions
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const totalWeight = filteredTransactions.reduce((sum, t) => sum + (t.weight || 0), 0);
  const avgPricePerKg = totalWeight > 0 ? totalRevenue / totalWeight : 0;

  // Group data based on selection using prop transactions
  const groupedData = React.useMemo(() => {
    const groups: Record<string, any> = {};

    filteredTransactions.forEach(transaction => {
      let key: string;
      const date = new Date(transaction.date);

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
          key = transaction.material;
          break;
        case 'supplier':
          key = transaction.supplierName;
          break;
        default:
          key = 'Unknown';
      }

      if (!groups[key]) {
        groups[key] = {
          transactions: 0,
          revenue: 0,
          weight: 0,
          materials: new Set(),
          suppliers: new Set()
        };
      }

      groups[key].transactions++;
      groups[key].revenue += transaction.totalAmount || 0;
      groups[key].weight += transaction.weight || 0;
      groups[key].materials.add(transaction.material);
      groups[key].suppliers.add(transaction.supplierName);
    });

    return Object.entries(groups).map(([key, data]) => ({
      key,
      ...data,
      avgPrice: data.weight > 0 ? data.revenue / data.weight : 0,
      materialCount: data.materials.size,
      supplierCount: data.suppliers.size
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

  // Clear all filters
  const clearFilters = () => {
    setSelectedMaterials([]);
    setSelectedSuppliers([]);
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
      'Transactions',
      'Revenue',
      'Weight (kg)',
      'Avg Price/kg'
    ];

    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      headers.push('Materials', 'Suppliers');
    }

    const csvContent = [
      headers.join(','),
      ...groupedData.map(group => {
        const baseRow = [
          group.key,
          group.transactions,
          group.revenue,
          group.weight.toFixed(1),
          group.avgPrice.toFixed(2)
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

  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Custom Report</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        {/* Show data source indicator */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✓ Using {transactions.length} transactions from current data ({filteredTransactions.length} matching filters)
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="material">Material</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
          </div>

          {/* Materials Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Materials ({selectedMaterials.length === 0 ? 'All' : selectedMaterials.length} selected)
            </label>
            {materials.length === 0 ? (
              <p className="text-gray-500 text-sm">No materials found in current data</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {materials.map(material => (
                  <button
                    key={material}
                    onClick={() => handleMaterialToggle(material)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedMaterials.includes(material)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {material}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Suppliers Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suppliers ({selectedSuppliers.length === 0 ? 'All' : selectedSuppliers.length} selected)
            </label>
            {supplierNames.length === 0 ? (
              <p className="text-gray-500 text-sm">No suppliers found in current data</p>
            ) : (
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                <div className="flex flex-wrap gap-2">
                  {supplierNames.map(supplier => (
                    <button
                      key={supplier}
                      onClick={() => handleSupplierToggle(supplier)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedSuppliers.includes(supplier)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {supplier}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-700">Transactions</h3>
                <p className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</p>
              </div>
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-700">Total Revenue</h3>
                <p className="text-2xl font-bold text-green-900">KES {totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-700">Total Weight</h3>
                <p className="text-2xl font-bold text-purple-900">{totalWeight.toFixed(1)} kg</p>
              </div>
              <TrendingUp className="text-purple-600" size={24} />
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-700">Avg Price/kg</h3>
                <p className="text-2xl font-bold text-orange-900">KES {avgPricePerKg.toFixed(2)}</p>
              </div>
              <div className="text-orange-600 text-xl">⚖️</div>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredTransactions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Results Table */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Report Results</h3>
                <div className="text-sm text-gray-600">
                  {groupedData.length} {groupBy === 'day' ? 'days' : groupBy === 'week' ? 'weeks' : groupBy === 'month' ? 'months' : groupBy === 'material' ? 'materials' : 'suppliers'} found
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {groupBy === 'day' ? 'Date' : 
                         groupBy === 'week' ? 'Week' :
                         groupBy === 'month' ? 'Month' :
                         groupBy === 'material' ? 'Material' : 'Supplier'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price/kg</th>
                      {(groupBy === 'day' || groupBy === 'week' || groupBy === 'month') && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materials</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suppliers</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedData
                      .sort((a, b) => {
                        if (groupBy === 'material' || groupBy === 'supplier') {
                          return b.revenue - a.revenue;
                        }
                        return a.key.localeCompare(b.key);
                      })
                      .map((group, index) => (
                        <tr key={group.key} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.key}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{group.transactions}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">KES {group.revenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{group.weight.toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">KES {group.avgPrice.toFixed(2)}</td>
                          {(groupBy === 'day' || groupBy === 'week' || groupBy === 'month') && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-600">{group.materialCount}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{group.supplierCount}</td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Button */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download size={16} />
                Export Report (CSV)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomReport;