// App.tsx - Mobile-First with Enhanced Top Slide-Down Menu
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Menu, X } from 'lucide-react';

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

// Fixed Material interface - ensure it matches what Analytics component expects
interface Material {
  id: string;
  name: string;
  category: string;
  current_price: number;
  current_price_per_kg: number; // Added this required property
  is_active: boolean; // Added this required property
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

// App component props interface - made optional since it's passed from AppRouter
interface AppProps {
  onNavigateBack?: () => void;
}

// Mobile-first Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen px-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-3 md:mt-4 text-gray-600 text-sm md:text-base">Loading data...</p>
    </div>
  </div>
);

// Mobile-first Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex items-center justify-center min-h-screen px-4">
    <div className="text-center w-full max-w-sm mx-auto">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-4 md:px-6 md:py-4 rounded-lg">
        <div className="flex items-center justify-center mb-2 md:mb-2">
          <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="font-bold text-sm md:text-base">Error loading data</p>
        </div>
        <p className="text-xs md:text-sm mb-3 md:mb-4">{error}</p>
        <button 
          onClick={onRetry}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 md:px-4 rounded transition-colors text-sm md:text-base"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

// Enhanced Professional Mobile Menu Button Component
const MobileMenuButton = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={`
        md:hidden fixed top-4 left-4 z-60 
        flex items-center justify-center
        w-12 h-12 
        rounded-xl
        shadow-lg border border-gray-200
        transition-all duration-300 ease-in-out
        transform hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isOpen 
          ? 'bg-gray-800 border-gray-700 shadow-xl' 
          : 'bg-white hover:bg-gray-50'
        }
      `}
      aria-label={isOpen ? "Close Menu" : "Open Menu"}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Hamburger Lines with Animation */}
        <div className={`
          absolute inset-0 flex flex-col justify-center items-center
          transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-0 rotate-180' : 'opacity-100 rotate-0'}
        `}>
          <Menu className={`w-6 h-6 transition-colors duration-300 ${
            isOpen ? 'text-white' : 'text-gray-700'
          }`} />
        </div>
        
        {/* X Icon with Animation */}
        <div className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-180'}
        `}>
          <X className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {/* Subtle gradient border effect */}
      <div className={`
        absolute inset-0 rounded-xl opacity-0 hover:opacity-100
        bg-gradient-to-r from-blue-500/20 to-purple-500/20
        transition-opacity duration-300
        ${isOpen ? 'hidden' : ''}
      `} />
    </button>
  );
};

const App: React.FC<AppProps> = ({ onNavigateBack }) => {
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
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

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On desktop, sidebar should be open by default
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        // Close sidebar when switching to mobile
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced tab change handler for mobile
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Close sidebar on mobile when tab is selected
    if (isMobile) {
      setSidebarOpen(false);
      setReportsOpen(false);
    }
  };

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

      // Handle materials with proper transformation
      if (materialsResult.status === 'fulfilled') {
        if (materialsResult.value.error) {
          console.error('Error fetching materials:', materialsResult.value.error);
        } else {
          // Transform materials to ensure all required properties exist
          const materialsData = materialsResult.value.data || [];
          const transformedMaterials: Material[] = materialsData.map((material: any) => ({
            id: material.id,
            name: material.name,
            category: material.category,
            current_price: material.current_price || 0,
            current_price_per_kg: material.current_price_per_kg || material.current_price || 0,
            is_active: material.is_active !== undefined ? material.is_active : true,
            unit: material.unit,
            description: material.description,
            created_at: material.created_at,
            updated_at: material.updated_at
          }));
          setMaterials(transformedMaterials);
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

  // Transform supplier for ranking display (keeping your existing implementation)
  const transformSupplierForRanking = (supplier: Supplier, transactions: Transaction[]) => {
    const supplierTransactions = transactions.filter(t => t.supplier_id === supplier.id);
    const recentTransactions = supplierTransactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return transactionDate >= lastMonth;
    });
    
    const currentMonthValue = recentTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const trend = currentMonthValue > 0 ? `+${Math.round((currentMonthValue / (supplier.total_value || 1)) * 100)}%` : '+0%';

    return {
      id: supplier.id,
      name: supplier.name,
      transactions: supplier.total_transactions || 0,
      value: supplier.total_value || 0,
      trend,
      tier: supplier.supplier_tier || 'occasional'
    };
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Event handlers
  const handleLogout = () => {
    console.log('Logout clicked');
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      // Fallback: reload page
      window.location.reload();
    }
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

  // Toggle sidebar for mobile with enhanced animation
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    
    // Add a small haptic feedback simulation for mobile
    if (navigator.vibrate && isMobile) {
      navigator.vibrate(50);
    }
  };

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (error) {
      return <ErrorDisplay error={error} onRetry={fetchData} />;
    }
    
    // Transform transactions for reports that still need them
    const reportTransactions = transformTransactionsForReports(transactions, suppliers);
    
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onRefresh={fetchData} />;
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
        return <WeeklyReport weekStartDate={new Date()} />;
      case 'reports-monthly':
        return <MonthlyReport transactions={reportTransactions} month={new Date()} />;
      case 'reports-custom':
        return <CustomReport transactions={reportTransactions} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onRefresh={fetchData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Mobile Overlay with enhanced animation */}
      {isMobile && sidebarOpen && (
        <div 
          className={`
            fixed inset-0 bg-black z-40 md:hidden
            transition-opacity duration-300 ease-in-out
            ${sidebarOpen ? 'bg-opacity-50' : 'bg-opacity-0'}
          `}
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar Component - Handles both mobile top menu and desktop sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange} // Use enhanced handler
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        reportsOpen={reportsOpen}
        setReportsOpen={setReportsOpen}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${
        isMobile ? '' : (sidebarOpen ? 'md:ml-0' : 'md:ml-0')
      }`}>
        {/* Header */}
        <div className="relative">
          <Header
            activeTab={activeTab}
            userName="Admin User"
            notificationCount={3}
            onNotificationClick={handleNotificationClick}
            onProfileClick={handleProfileClick}
          />
          
          {/* Enhanced Professional Mobile Menu Button */}
          <MobileMenuButton isOpen={sidebarOpen} onClick={toggleSidebar} />
        </div>

        {/* Content with mobile top menu padding and smooth transitions */}
        <main className={`
          flex-1 overflow-y-auto p-4 md:p-6 
          transition-all duration-300 ease-in-out
          ${isMobile && sidebarOpen ? 'pt-4' : ''}
        `}>
          <div className="max-w-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;