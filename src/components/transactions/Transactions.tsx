import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Filter, Calendar, TrendingUp, Package, DollarSign, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Define the Transaction type to match your database structure
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

interface TransactionsProps {
  onTransactionUpdate?: (transaction: Transaction) => Promise<void>;
  transactions?: Transaction[];
}

// Update the StatusBadge to handle all possible status values
function StatusBadge({ status }: { status: string }) {
  const classes = {
    completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
    processing: 'bg-blue-50 text-blue-700 border border-blue-200',
    cancelled: 'bg-gray-50 text-gray-700 border border-gray-200'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatsCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ComponentType<any>; color: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Transactions({ onTransactionUpdate }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch data from Supabase
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      // Transform the data if needed (the database fields match our interface)
      setTransactions(data || []);
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction from Supabase
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
      
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  // Update transaction status in Supabase
  const handleUpdateStatus = async (transactionId: string, newStatus: string) => {
    try {
      const { data, error: updateError } = await supabase
        .from('transactions')
        .update({ 
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setTransactions(prev => 
        prev.map(tx => tx.id === transactionId ? data : tx)
      );
      
      if (data && onTransactionUpdate) {
        await onTransactionUpdate(data);
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
      alert('Failed to update transaction status. Please try again.');
    }
  };

  // Export transactions
  const handleExport = async () => {
    try {
      const csvContent = transactions.map(tx => 
        `${tx.id},${tx.transaction_date},${tx.walkin_name || 'N/A'},${tx.material_type},${tx.weight_kg || 0},${tx.total_amount},${tx.payment_status || 'pending'}`
      ).join('\n');
      
      const blob = new Blob([`ID,Date,Supplier,Material,Weight,Amount,Status\n${csvContent}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting transactions:', err);
      alert('Failed to export transactions');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.walkin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.material_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tx.payment_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Statistics
  const completedTransactions = transactions.filter(tx => tx.payment_status === 'completed').length;
  const totalValue = transactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
  const totalWeight = transactions.reduce((sum, tx) => sum + (tx.weight_kg || 0), 0);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
            <p className="font-bold mb-2">Error Loading Data</p>
            <p className="text-sm mb-4">{error}</p>
            <button 
              onClick={fetchTransactions}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600 mt-1">Manage and track all material transactions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
                <Plus size={20} />
                New Transaction
              </button>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first transaction. All your material purchases and sales will appear here.
              </p>
              <button className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm mx-auto">
                <Plus size={20} />
                Create First Transaction
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">Manage and track all material transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
              <Plus size={20} />
              New Transaction
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            title="Total Transactions" 
            value={transactions.length.toString()} 
            icon={Package}
            color="bg-blue-500"
          />
          <StatsCard 
            title="Total Value" 
            value={`KES ${totalValue.toLocaleString()}`}
            icon={DollarSign}
            color="bg-emerald-500"
          />
          <StatsCard 
            title="Total Weight" 
            value={`${totalWeight.toFixed(1)} kg`}
            icon={TrendingUp}
            color="bg-purple-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by ID, supplier, or material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-gray-400" size={20} />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Calendar size={20} />
                Date Range
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Download size={20} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr className="text-left text-sm text-gray-700">
                  <th className="px-6 py-4 font-semibold">Transaction ID</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Supplier</th>
                  <th className="px-6 py-4 font-semibold">Material</th>
                  <th className="px-6 py-4 font-semibold">Weight (kg)</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentTransactions.map((tx, index) => (
                  <tr key={tx.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                        {tx.transaction_number || tx.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                          {tx.walkin_name?.split(' ').map((n: string) => n[0]).join('') || 'WC'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{tx.walkin_name || 'Walk-in Customer'}</div>
                          {tx.walkin_phone && (
                            <div className="text-xs text-gray-500">{tx.walkin_phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{tx.material_type}</div>
                        {tx.material_category && (
                          <div className="text-xs text-gray-500">{tx.material_category}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {tx.weight_kg || 0} kg
                      {tx.quality_grade && (
                        <div className="text-xs text-gray-500">Grade: {tx.quality_grade}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-semibold text-gray-900">
                        KES {(tx.total_amount || 0).toLocaleString()}
                      </div>
                      {tx.unit_price && (
                        <div className="text-xs text-gray-500">
                          @ KES {tx.unit_price}/kg
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.payment_status || 'pending'} />
                      {tx.payment_method && (
                        <div className="text-xs text-gray-500 mt-1">
                          via {tx.payment_method}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          title="View Details"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                        >
                          <Eye size={16} className="text-gray-600 group-hover:text-teal-600" />
                        </button>
                        <button 
                          title="Edit Transaction"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                        >
                          <Edit2 size={16} className="text-gray-600 group-hover:text-blue-600" />
                        </button>
                        <button 
                          title="Delete Transaction"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                        >
                          <Trash2 size={16} className="text-gray-600 group-hover:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-teal-600 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}