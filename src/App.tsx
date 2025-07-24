// App.tsx - Updated version with real report components
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Import your actual component files
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Dashboard from './components/dashboard/Dashboard';
import MaterialsPage from './pages/MaterialsPage';
import Suppliers from './components/suppliers/Suppliers';
import Transactions from './components/transactions/Transactions';
import SettingsPage from './components/settings/Settings';
import Analytics from './components/analytics/Analytics';

// Import the real report components
import DailyReport from './components/reports/DailyReport';
import WeeklyReport from './components/reports/WeeklyReport';
import MonthlyReport from './components/reports/MonthlyReport';
import CustomReport from './components/reports/CustomReport';

// Define interfaces to match database structure
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

interface Material {
  id: string;
  name: string;
  category: string;
  current_price: number;
  unit: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  totalWeight: number;
  activeSuppliers: number;
  todayTransactions?: number;
  todayRevenue?: number;
  weekGrowth?: number;
  monthGrowth?: number;
  weightGrowth?: number;
  supplierGrowth?: number;
}

// Transform database transaction to report component format
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

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading data...</p>
    </div>
  </div>
);

// Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="font-bold">Error loading data</p>
        </div>
        <p className="text-sm mb-4">{error}</p>
        <button 
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);
  
  // Data state - using only empty arrays initially
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalRevenue: 0,
    totalWeight: 0,
    activeSuppliers: 0,
    todayTransactions: 0,
    todayRevenue: 0,
    weekGrowth: 0,
    monthGrowth: 0,
    weightGrowth: 0,
    supplierGrowth: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Supabase ONLY
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [suppliersResult, transactionsResult, materialsResult] = await Promise.allSettled([
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('materials').select('*').order('created_at', { ascending: false })
      ]);

      // Handle suppliers
      if (suppliersResult.status === 'fulfilled') {
        if (suppliersResult.value.error) {
          console.error('Error fetching suppliers:', suppliersResult.value.error);
        } else {
          setSuppliers(suppliersResult.value.data || []);
        }
      }

      // Handle transactions
      if (transactionsResult.status === 'fulfilled') {
        if (transactionsResult.value.error) {
          console.error('Error fetching transactions:', transactionsResult.value.error);
        } else {
          setTransactions(transactionsResult.value.data || []);
        }
      }

      // Handle materials
      if (materialsResult.status === 'fulfilled') {
        if (materialsResult.value.error) {
          console.error('Error fetching materials:', materialsResult.value.error);
        } else {
          setMaterials(materialsResult.value.data || []);
        }
      }

      // Calculate stats from fetched data
      const suppliersData = suppliersResult.status === 'fulfilled' && !suppliersResult.value.error ? 
        (suppliersResult.value.data || []) : [];
      const transactionsData = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error ? 
        (transactionsResult.value.data || []) : [];
      
      calculateStats(transactionsData, suppliersData);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard stats from real data
  const calculateStats = (transactionsData: Transaction[], suppliersData: Supplier[]) => {
    const completedTransactions = transactionsData.filter(tx => tx.payment_status === 'completed');
    const today = new Date().toISOString().split('T')[0];
    
    const todayTransactions = transactionsData.filter(tx => {
      const txDate = tx.transaction_date?.split('T')[0];
      return txDate === today;
    });

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const weekTransactions = transactionsData.filter(tx => {
      const txDate = tx.transaction_date?.split('T')[0];
      return txDate && txDate >= lastWeek;
    });
    
    const monthTransactions = transactionsData.filter(tx => {
      const txDate = tx.transaction_date?.split('T')[0];
      return txDate && txDate >= lastMonth;
    });

    const newStats: DashboardStats = {
      totalTransactions: transactionsData.length,
      totalRevenue: completedTransactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
      totalWeight: completedTransactions.reduce((sum, tx) => sum + (tx.weight_kg || 0), 0),
      activeSuppliers: suppliersData.filter(s => s.status === 'active').length,
      todayTransactions: todayTransactions.length,
      todayRevenue: todayTransactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
      weekGrowth: weekTransactions.length > 0 ? ((weekTransactions.length / Math.max(transactionsData.length, 1)) * 100) : 0,
      monthGrowth: monthTransactions.length > 0 ? ((monthTransactions.length / Math.max(transactionsData.length, 1)) * 100) : 0,
      weightGrowth: 0,
      supplierGrowth: 0
    };

    setStats(newStats);
  };

  // Transform transactions for dashboard compatibility
  const transformTransactionsForDashboard = (transactions: Transaction[]) => {
    return transactions.map(tx => ({
      id: tx.id,
      transactionDate: tx.transaction_date,
      createdAt: tx.created_at,
      materialType: tx.material_type,
      totalAmount: tx.total_amount,
      paymentStatus: tx.payment_status,
      walkinName: tx.walkin_name,
      supplierId: tx.supplier_id,
      weightKg: tx.weight_kg,
      isWalkin: tx.is_walkin,
      // Legacy fields for backward compatibility
      supplierName: tx.walkin_name || 'Unknown',
      quantity: tx.weight_kg || 0,
      totalValue: tx.total_amount || 0,
      status: tx.payment_status === 'completed' ? 'completed' : 'pending',
      date: tx.transaction_date,
      timestamp: tx.created_at,
      type: 'purchase',
      transactionType: 'purchase',
      amount: tx.total_amount || 0,
      totalWeight: tx.weight_kg || 0,
      weight: tx.weight_kg || 0,
      description: tx.notes
    }));
  };

  // Transform transactions for report components
  const transformTransactionsForReports = (transactions: Transaction[], suppliers: Supplier[]): ReportTransaction[] => {
    return transactions.map(tx => {
      // Find supplier name
      const supplier = suppliers.find(s => s.id === tx.supplier_id);
      const supplierName = tx.is_walkin ? (tx.walkin_name || 'Walk-in Customer') : (supplier?.name || 'Unknown Supplier');
      
      return {
        id: tx.id,
        date: tx.transaction_date,
        material: tx.material_type,
        supplierName: supplierName,
        supplierId: tx.supplier_id || 'walk-in',
        totalAmount: tx.total_amount || 0,
        weight: tx.weight_kg || 0,
        createdAt: tx.created_at,
        paymentStatus: tx.payment_status || 'pending',
        isWalkin: tx.is_walkin,
        walkinName: tx.walkin_name
      };
    });
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Event handlers
  // In your App.tsx, find the handleLogout function and update it:
const handleLogout = () => {
  console.log('Logout clicked');
  // Add this line to go back to login screen
  window.location.reload();
};

  const handleNotificationClick = () => {
    console.log('Notifications clicked');
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
  };

  const handleTransactionUpdate = async (transaction: Transaction) => {
    console.log('Transaction updated:', transaction);
    await fetchData();
  };

  const handleSupplierUpdate = async (supplier: Supplier) => {
    console.log('Supplier updated:', supplier);
    await fetchData();
  };

  // Render content based on active tab
  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (error) {
      return <ErrorDisplay error={error} onRetry={fetchData} />;
    }
    
    // Transform transactions for reports
    const reportTransactions = transformTransactionsForReports(transactions, suppliers);
    
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} transactions={transformTransactionsForDashboard(transactions)} />;
      case 'transactions':
        return <Transactions onTransactionUpdate={handleTransactionUpdate} />;
      case 'suppliers':
        return <Suppliers onSupplierUpdate={handleSupplierUpdate} />;
      case 'materials':
        return <MaterialsPage />;
      case 'analytics':
        return <Analytics 
          transactions={transactions}
          suppliers={suppliers}
          materials={materials}
        />;
      case 'reports-daily':
        return <DailyReport currentDate={new Date()} />;
      case 'reports-weekly':
        return <WeeklyReport transactions={reportTransactions} weekStartDate={new Date()} />;
      case 'reports-monthly':
        return <MonthlyReport transactions={reportTransactions} month={new Date()} />;
      case 'reports-custom':
        return <CustomReport transactions={reportTransactions} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard stats={stats} transactions={transformTransactionsForDashboard(transactions)} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        reportsOpen={reportsOpen}
        setReportsOpen={setReportsOpen}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          activeTab={activeTab}
          userName="Admin User"
          notificationCount={3}
          onNotificationClick={handleNotificationClick}
          onProfileClick={handleProfileClick}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}