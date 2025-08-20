// App.tsx - Complete Updated Version with Enhanced Persistent Notification System
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Menu, X, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Import enhanced notification system
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import TransactionNotification from './components/dashboard/TransactionNotification';
import { NotificationPersistenceService } from './services/notificationPersistenceService';

// Import debug utility
import PhotoDebugUtility from './components/debug/PhotoDebugUtility';

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

// Enhanced Transaction interface matching your actual database schema
interface Transaction {
  id: string;
  transaction_type: 'Purchase' | 'Sale';
  
  // Common fields
  supplier_id?: string | null;
  material_type: string; // Unified field for material_type/material_name
  transaction_date: string;
  total_amount: number;
  created_at: string;
  payment_method?: string | null;
  payment_status?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  weight_kg?: number | null;
  
  // Unified customer/supplier name field
  customer_name: string; // Maps to walkin_name for purchases, supplier_name for sales
  customer_phone?: string | null; // For purchases only
  
  // Purchase-specific fields (from transactions table)
  transaction_number?: string | null;
  is_walkin?: boolean;
  walkin_name?: string | null;
  walkin_phone?: string | null;
  material_category?: string | null;
  unit_price?: number | null;
  payment_reference?: string | null;
  quality_grade?: string | null;
  deductions?: number | null;
  final_amount?: number | null;
  receipt_number?: string | null;
  supplier_name?: string | null;
  
  // Sales-specific fields (from sales_transactions table)
  transaction_id?: string; // For sales transactions
  material_id?: number | null;
  material_name?: string; // For sales transactions
  price_per_kg?: number | null;
  is_special_price?: boolean;
  original_price?: number | null;
  transaction_type_field?: string | null;
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

interface Material {
  id: string;
  name: string;
  category: string;
  current_price: number;
  current_price_per_kg: number;
  is_active: boolean;
  unit: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// Analytics component compatible types
interface AnalyticsSupplier {
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

interface AnalyticsMaterial {
  id: number;
  name: string;
  category: string;
  current_price: number;
  current_price_per_kg: number;
  is_active: boolean;
  unit: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface AnalyticsSalesTransaction {
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
  totalSalesTransactions?: number;
  totalSalesRevenue?: number;
  todaySalesTransactions?: number;
  todaySalesRevenue?: number;
  salesGrowth?: number;
  avgSalesValue?: number;
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

interface AppProps {
  onNavigateBack?: () => void;
}

// Enhanced Connection Status Component
const ConnectionStatus = ({ isOnline }: { isOnline: boolean }) => (
  <div className={`fixed top-4 right-4 z-[60] transition-all duration-300 ${
    isOnline ? 'opacity-0 pointer-events-none' : 'opacity-100'
  }`}>
    <div className="bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Offline</span>
    </div>
  </div>
);

// Enhanced Recovery Component
const RecoveryComponent = ({ 
  onRecovery, 
  isVisible 
}: { 
  onRecovery: () => void;
  isVisible: boolean;
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStats, setRecoveryStats] = useState<any>(null);

  const handleEmergencyRecovery = async () => {
    setIsRecovering(true);
    try {
      console.log('Starting emergency notification recovery...');
      
      // Get recovery stats
      const stats = await NotificationPersistenceService.getNotificationStats();
      setRecoveryStats(stats);
      
      // Perform emergency recovery
      const recoveredNotifications = await NotificationPersistenceService.emergencyRecovery();
      
      console.log(`Emergency recovery completed: ${recoveredNotifications.length} notifications recovered`);
      
      // Trigger refresh in the notification context
      onRecovery();
      
      // Show success message
      setTimeout(() => {
        alert(`✅ Recovery Complete!\n\nRecovered ${recoveredNotifications.length} unhandled notifications.\n\nStats:\n- Total: ${stats.total}\n- Pending: ${stats.pending}\n- Handled: ${stats.handled}`);
      }, 500);
      
    } catch (error) {
      console.error('Emergency recovery failed:', error);
      alert('❌ Recovery failed. Check your connection and try again.');
    } finally {
      setIsRecovering(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] animate-slide-up">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">System Recovery</h3>
            <p className="text-xs text-gray-600">Restore unhandled notifications</p>
          </div>
        </div>
        
        {recoveryStats && (
          <div className="text-xs text-gray-600 mb-3 space-y-1 bg-gray-50 rounded p-2">
            <div className="flex justify-between">
              <span>Pending:</span>
              <span className="font-medium">{recoveryStats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-medium">{recoveryStats.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Handled:</span>
              <span className="font-medium">{recoveryStats.handled}</span>
            </div>
          </div>
        )}
        
        <button
          onClick={handleEmergencyRecovery}
          disabled={isRecovering}
          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isRecovering
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
          }`}
        >
          {isRecovering ? (
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Recovering...
            </div>
          ) : (
            'Recover Notifications'
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Restores unhandled transactions from the last 48 hours
        </p>
      </div>
    </div>
  );
};

// Enhanced Navigation Blocked Warning
const NavigationBlockedWarning = ({ 
  unhandledCount, 
  onEmergencyRecovery 
}: { 
  unhandledCount: number;
  onEmergencyRecovery: () => void;
}) => (
  <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] animate-pulse">
    <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl border border-red-700">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">
          {unhandledCount} unhandled notification{unhandledCount > 1 ? 's' : ''} - Navigation blocked
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEmergencyRecovery}
          className="text-xs bg-red-700 hover:bg-red-800 px-3 py-1 rounded transition-colors font-medium"
        >
          Emergency Recovery
        </button>
        <span className="text-xs opacity-90">
          Complete notifications to continue
        </span>
      </div>
    </div>
  </div>
);

// Loading and Error components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen px-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-3 md:mt-4 text-gray-600 text-sm md:text-base">Loading data...</p>
    </div>
  </div>
);

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

const MobileMenuButton = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={`
        md:hidden fixed top-4 left-4 z-[60]
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
        <div className={`
          absolute inset-0 flex flex-col justify-center items-center
          transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-0 rotate-180' : 'opacity-100 rotate-0'}
        `}>
          <Menu className={`w-6 h-6 transition-colors duration-300 ${
            isOpen ? 'text-white' : 'text-gray-700'
          }`} />
        </div>
        
        <div className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-180'}
        `}>
          <X className="w-6 h-6 text-white" />
        </div>
      </div>
    </button>
  );
};

// Transform functions for Analytics compatibility
const transformSuppliersForAnalytics = (suppliers: Supplier[]): AnalyticsSupplier[] => {
  return suppliers.map(supplier => ({
    ...supplier,
    supplier_tier: supplier.supplier_tier || 'occasional',
    credit_limit: supplier.credit_limit || 0,
    preferred_payment_method: supplier.preferred_payment_method || 'cash',
    total_weight: supplier.total_weight || 0,
    average_transaction_value: supplier.average_transaction_value || 0,
    registered_date: supplier.registered_date || supplier.created_at
  }));
};

const transformMaterialsForAnalytics = (materials: Material[]): AnalyticsMaterial[] => {
  return materials.map((material, index) => ({
    ...material,
    id: parseInt(material.id) || index + 1
  }));
};

const transformSalesTransactionsForAnalytics = (transactions: Transaction[]): AnalyticsSalesTransaction[] => {
  const salesTransactions = transactions.filter(tx => tx.transaction_type === 'Sale');
  
  return salesTransactions.map(tx => ({
    id: tx.id,
    transaction_id: tx.transaction_id || tx.id,
    supplier_id: tx.supplier_id,
    supplier_name: tx.customer_name,
    material_id: null,
    material_name: tx.material_type,
    weight_kg: tx.weight_kg || 0,
    price_per_kg: tx.price_per_kg || (tx.weight_kg && tx.weight_kg > 0 ? tx.total_amount / tx.weight_kg : 0),
    total_amount: tx.total_amount || 0,
    transaction_date: tx.transaction_date,
    notes: tx.notes,
    is_special_price: tx.is_special_price || false,
    original_price: tx.original_price,
    payment_method: tx.payment_method,
    payment_status: tx.payment_status,
    transaction_type: 'Sale',
    created_by: tx.created_by,
    created_at: tx.created_at,
    updated_at: tx.updated_at
  }));
};

// Main App Component with Enhanced Persistent Notification Handling
const AppContent: React.FC<AppProps> = ({ onNavigateBack }) => {
  // Get enhanced notification context
  const {
    notificationQueue,
    currentNotificationIndex,
    isNotificationVisible,
    hasUnhandledNotifications,
    isNavigationBlocked,
    attemptNavigation,
    dismissCurrentNotification,
    navigateToNext,
    navigateToPrevious,
    markCurrentAsHandled,
    getUnhandledCount,
    refreshNotifications,
    sessionInfo
  } = useNotifications();

  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Data state
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
    supplierGrowth: 0,
    totalSalesTransactions: 0,
    totalSalesRevenue: 0,
    todaySalesTransactions: 0,
    todaySalesRevenue: 0,
    salesGrowth: 0,
    avgSalesValue: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Get Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App came online, syncing...');
      // Trigger sync when coming back online
      setTimeout(() => {
        fetchData();
        refreshNotifications();
      }, 1000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('App went offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshNotifications]);

  // Initialize mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize notification persistence system
  useEffect(() => {
    console.log('Initializing notification persistence system...');
    
    // Start periodic cleanup
    const stopCleanup = NotificationPersistenceService.startPeriodicCleanup(60);
    
    // Check for unhandled notifications on startup
    const checkForUnhandledNotifications = async () => {
      try {
        const stats = await NotificationPersistenceService.getNotificationStats();
        console.log('Startup notification stats:', stats);
        
        if (stats.pending > 0) {
          console.log(`Found ${stats.pending} pending notifications from previous session`);
          setShowRecovery(true);
          
          // Auto-trigger recovery after 5 seconds if user doesn't manually trigger it
          setTimeout(() => {
            if (showRecovery) {
              console.log('Auto-triggering notification recovery...');
              handleRecoveryAction();
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Error checking for unhandled notifications:', error);
      }
    };

    // Run check after a brief delay to ensure context is ready
    setTimeout(checkForUnhandledNotifications, 2000);

    return () => {
      stopCleanup();
    };
  }, []);

  // Enhanced tab change handler with navigation blocking
  const handleTabChange = (tab: string) => {
    if (!attemptNavigation(tab)) {
      return;
    }
    
    setActiveTab(tab);
    if (isMobile) {
      setSidebarOpen(false);
      setReportsOpen(false);
    }
  };

  // Enhanced navigation handlers for Dashboard
  const handleNavigateToTransactions = () => {
    console.log('Navigating to transactions from dashboard');
    if (attemptNavigation('transactions')) {
      setActiveTab('transactions');
      if (isMobile) {
        setSidebarOpen(false);
        setReportsOpen(false);
      }
    }
  };

  const handleNavigateToSuppliers = () => {
    console.log('Navigating to suppliers from dashboard');
    if (attemptNavigation('suppliers')) {
      setActiveTab('suppliers');
      if (isMobile) {
        setSidebarOpen(false);
        setReportsOpen(false);
      }
    }
  };

  const handleNavigateToAddSupplier = () => {
    console.log('Navigating to add supplier from dashboard');
    if (attemptNavigation('suppliers')) {
      setActiveTab('suppliers');
      if (isMobile) {
        setSidebarOpen(false);
        setReportsOpen(false);
      }
    }
  };

  // Enhanced data fetching with proper transaction mapping
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [suppliersResult, transactionsResult, salesTransactionsResult, materialsResult] = await Promise.allSettled([
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select(`
          *,
          suppliers:supplier_id (
            name,
            phone,
            email
          )
        `).order('created_at', { ascending: false }),
        supabase.from('sales_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('materials').select('*').order('created_at', { ascending: false })
      ]);

      // Handle suppliers
      if (suppliersResult.status === 'fulfilled') {
        if (suppliersResult.value.error) {
          console.error('Error fetching suppliers:', suppliersResult.value.error);
        } else {
          const suppliersData = suppliersResult.value.data || [];
          console.log('App: Fetched suppliers:', suppliersData.length);
          setSuppliers(suppliersData);
        }
      }

      // Transform and combine transactions
      const purchaseData = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error 
        ? transactionsResult.value.data || [] 
        : [];
      
      const salesData = salesTransactionsResult.status === 'fulfilled' && !salesTransactionsResult.value.error 
        ? salesTransactionsResult.value.data || [] 
        : [];

      // Transform purchases to unified Transaction interface
      const purchases: Transaction[] = purchaseData.map(tx => ({
        id: tx.id,
        transaction_type: 'Purchase' as const,
        supplier_id: tx.supplier_id,
        customer_name: tx.supplier_name || tx.suppliers?.name || tx.walkin_name || 'Unknown Customer',
        customer_phone: tx.suppliers?.phone || tx.walkin_phone,
        material_type: tx.material_type,
        transaction_date: tx.transaction_date,
        total_amount: tx.total_amount,
        created_at: tx.created_at,
        transaction_number: tx.transaction_number,
        is_walkin: Boolean(tx.is_walkin),
        walkin_name: tx.walkin_name,
        walkin_phone: tx.walkin_phone,
        material_category: tx.material_category,
        weight_kg: tx.weight_kg,
        unit_price: tx.unit_price,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
        payment_reference: tx.payment_reference,
        quality_grade: tx.quality_grade,
        deductions: tx.deductions,
        final_amount: tx.final_amount,
        receipt_number: tx.receipt_number,
        notes: tx.notes,
        created_by: tx.created_by,
        updated_at: tx.updated_at,
        supplier_name: tx.supplier_name
      }));

      // Transform sales to unified Transaction interface
      const sales: Transaction[] = salesData.map(tx => ({
        id: tx.id,
        transaction_type: 'Sale' as const,
        supplier_id: tx.supplier_id,
        customer_name: tx.supplier_name || 'Unknown Supplier',
        customer_phone: null,
        material_type: tx.material_name,
        transaction_date: tx.transaction_date,
        total_amount: tx.total_amount,
        created_at: tx.created_at,
        transaction_id: tx.transaction_id,
        is_walkin: false,
        material_category: tx.material_name,
        weight_kg: tx.weight_kg,
        price_per_kg: tx.price_per_kg,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
        notes: tx.notes,
        created_by: tx.created_by,
        updated_at: tx.updated_at,
        is_special_price: tx.is_special_price,
        original_price: tx.original_price,
        material_name: tx.material_name,
        material_id: tx.material_id,
        supplier_name: tx.supplier_name,
        transaction_type_field: tx.transaction_type
      }));

      // Combine and sort by created_at
      const allTransactions = [...purchases, ...sales].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);

      // Handle materials
      if (materialsResult.status === 'fulfilled') {
        if (materialsResult.value.error) {
          console.error('Error fetching materials:', materialsResult.value.error);
        } else {
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

      // Calculate stats
      const suppliersData = suppliersResult.status === 'fulfilled' && !suppliersResult.value.error ? 
        (suppliersResult.value.data || []) : [];
      
      calculateStats(allTransactions, suppliersData);
      setLastSyncTime(new Date());

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced calculate dashboard stats
  const calculateStats = (allTransactions: Transaction[], suppliersData: Supplier[]) => {
    const completedTransactions = allTransactions.filter(tx => tx.payment_status === 'completed');
    const purchaseTransactions = allTransactions.filter(tx => tx.transaction_type === 'Purchase');
    const salesTransactions = allTransactions.filter(tx => tx.transaction_type === 'Sale');
    const completedPurchases = purchaseTransactions.filter(tx => tx.payment_status === 'completed');
    const completedSales = salesTransactions.filter(tx => tx.payment_status === 'completed');
    
    const today = new Date().toISOString().split('T')[0];
    
    const todayTransactions = allTransactions.filter(tx => {
      const txDate = tx.transaction_date?.split('T')[0];
      return txDate === today;
    });

    const todayPurchases = todayTransactions.filter(tx => tx.transaction_type === 'Purchase');
    const todaySales = todayTransactions.filter(tx => tx.transaction_type === 'Sale');

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const weekTransactions = allTransactions.filter(tx => {
      const txDate = tx.transaction_date?.split('T')[0];
      return txDate && txDate >= lastWeek;
    });

    const weekPurchases = weekTransactions.filter(tx => tx.transaction_type === 'Purchase');
    const weekSales = weekTransactions.filter(tx => tx.transaction_type === 'Sale');
    
    const monthTransactions = allTransactions.filter(tx => {
      const txDate = tx.transaction_date?.split('T')[0];
      return txDate && txDate >= lastMonth;
    });

    const newStats: DashboardStats = {
      totalTransactions: purchaseTransactions.length,
      totalRevenue: completedPurchases.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
      totalWeight: completedPurchases.reduce((sum, tx) => sum + (tx.weight_kg || 0), 0),
      activeSuppliers: suppliersData.filter(s => s.status === 'active').length,
      todayTransactions: todayPurchases.length,
      todayRevenue: todayPurchases.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
      weekGrowth: weekPurchases.length > 0 ? ((weekPurchases.length / Math.max(purchaseTransactions.length, 1)) * 100) : 0,
      monthGrowth: monthTransactions.length > 0 ? ((monthTransactions.length / Math.max(allTransactions.length, 1)) * 100) : 0,
      weightGrowth: 0,
      supplierGrowth: 0,
      totalSalesTransactions: salesTransactions.length,
      totalSalesRevenue: completedSales.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
      todaySalesTransactions: todaySales.length,
      todaySalesRevenue: todaySales.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
      salesGrowth: weekSales.length > 0 ? ((weekSales.length / Math.max(salesTransactions.length, 1)) * 100) : 0,
      avgSalesValue: salesTransactions.length > 0 ? (completedSales.reduce((sum, tx) => sum + (tx.total_amount || 0), 0) / salesTransactions.length) : 0
    };

    setStats(newStats);
  };

  // Handle recovery action
  const handleRecoveryAction = async () => {
    setShowRecovery(false);
    try {
      console.log('Triggering notification recovery...');
      await refreshNotifications();
      console.log('Notifications refreshed from persistent storage');
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Enhanced logout with navigation check
  const handleLogout = () => {
    if (!attemptNavigation('logout')) {
      return;
    }
    
    console.log('Logout clicked');
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.location.reload();
    }
  };

  // Enhanced notification click handler with stats
  const handleNotificationClick = async () => {
    console.log('Notifications clicked - count:', getUnhandledCount());
    
    try {
      const stats = await NotificationPersistenceService.getNotificationStats();
      console.log('Current notification stats:', stats);
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
  };

  const handleTransactionUpdate = async (transaction: Transaction) => {
    console.log('Transaction updated:', transaction);
    setTransactions(prev => 
      prev.map(tx => tx.id === transaction.id ? transaction : tx)
    );
    await fetchData();
  };

  const handleSupplierUpdate = async (supplier: Supplier) => {
    console.log('Supplier updated:', supplier);
    await fetchData();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    if (navigator.vibrate && isMobile) {
      navigator.vibrate(50);
    }
  };

  const handleOverlayClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleNotificationClose = () => {
    dismissCurrentNotification();
  };

  // Emergency recovery handler
  const handleEmergencyRecovery = async () => {
    try {
      await NotificationPersistenceService.emergencyRecovery();
      await refreshNotifications();
    } catch (error) {
      console.error('Emergency recovery failed:', error);
    }
  };

  // Transform transactions for reports
  const transformTransactionsForReports = (transactions: Transaction[], suppliers: Supplier[]): ReportTransaction[] => {
    return transactions.map(tx => {
      const supplierName = tx.customer_name || 'Unknown Customer';
      
      return {
        id: tx.id,
        date: tx.transaction_date,
        material: tx.material_type,
        supplierName: supplierName,
        supplierId: tx.supplier_id || (tx.transaction_type === 'Sale' ? 'sale' : 'walk-in'),
        totalAmount: tx.total_amount || 0,
        weight: tx.weight_kg || 0,
        createdAt: tx.created_at,
        paymentStatus: tx.payment_status || 'pending',
        isWalkin: Boolean(tx.is_walkin),
        walkinName: tx.transaction_type === 'Purchase' ? tx.customer_name : null
      };
    });
  };

  // Render content based on active tab
  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (error) {
      return <ErrorDisplay error={error} onRetry={fetchData} />;
    }
    
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onRefresh={fetchData}
            onNavigateToTransactions={handleNavigateToTransactions}
            onNavigateToSuppliers={handleNavigateToSuppliers}
            onNavigateToAddSupplier={handleNavigateToAddSupplier}
          />
        );
      case 'transactions':
        return <Transactions onTransactionUpdate={handleTransactionUpdate} transactions={transactions} />;
      case 'suppliers':
        return <Suppliers onSupplierUpdate={handleSupplierUpdate} />;
      case 'materials':
        return <MaterialsPage />;
      case 'analytics':
        const analyticsSuppliers = transformSuppliersForAnalytics(suppliers);
        const analyticsMaterials = transformMaterialsForAnalytics(materials);
        const analyticsSalesTransactions = transformSalesTransactionsForAnalytics(transactions);
        
        return <Analytics 
          suppliers={analyticsSuppliers}
          materials={analyticsMaterials}
          salesTransactions={analyticsSalesTransactions}
        />;
      case 'reports-daily':
        return <DailyReport currentDate={new Date()} />;
      case 'reports-weekly':
        return <WeeklyReport weekStartDate={new Date()} />;
      case 'reports-monthly':
        return <MonthlyReport month={new Date()} />;
      case 'reports-custom':
        return <CustomReport />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <Dashboard 
            onRefresh={fetchData}
            onNavigateToTransactions={handleNavigateToTransactions}
            onNavigateToSuppliers={handleNavigateToSuppliers}
            onNavigateToAddSupplier={handleNavigateToAddSupplier}
          />
        );
    }
  };

  const currentNotification = notificationQueue[currentNotificationIndex];

  return (
    <>
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
      
      <div className="flex h-screen bg-gray-50 relative">
        {/* Connection Status */}
        <ConnectionStatus isOnline={isOnline} />

        {/* Enhanced Navigation Blocked Warning with Recovery */}
        {isNavigationBlocked && (
          <NavigationBlockedWarning 
            unhandledCount={getUnhandledCount()} 
            onEmergencyRecovery={handleEmergencyRecovery}
          />
        )}

        {/* Session Info Display (Development only) */}
        {process.env.NODE_ENV === 'development' && sessionInfo && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-black text-white text-xs p-2 rounded max-w-xs">
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3" />
              <span>Session: {sessionInfo.sessionId.slice(-8)}</span>
              <span>•</span>
              <span>Notifications: {notificationQueue.length}</span>
              <span>•</span>
              <span>Last Sync: {lastSyncTime.toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Recovery Component */}
        <RecoveryComponent onRecovery={handleRecoveryAction} isVisible={showRecovery} />

        {/* Mobile Overlay */}
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

        {/* Sidebar Component */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
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
              notificationCount={getUnhandledCount()}
              onNotificationClick={handleNotificationClick}
              onProfileClick={handleProfileClick}
            />
            
            {/* Mobile Menu Button */}
            <MobileMenuButton isOpen={sidebarOpen} onClick={toggleSidebar} />
          </div>

          {/* Content */}
          <main className={`
            flex-1 overflow-y-auto p-4 md:p-6 
            transition-all duration-300 ease-in-out
            ${isMobile && sidebarOpen ? 'pt-4' : ''}
            ${isNavigationBlocked ? 'opacity-50 pointer-events-none' : ''}
          `}>
            <div className="max-w-full">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Debug utility */}
      <PhotoDebugUtility />

      {/* Enhanced Global Transaction Notification Modal */}
      {currentNotification && (
        <TransactionNotification
          transaction={currentNotification.transaction}
          suppliers={suppliers}
          photos={currentNotification.photos}
          eventType={currentNotification.eventType}
          isVisible={isNotificationVisible}
          onClose={handleNotificationClose}
          onNext={navigateToNext}
          onPrevious={navigateToPrevious}
          onMarkAsHandled={markCurrentAsHandled}
          notificationQueue={notificationQueue}
          currentQueueIndex={currentNotificationIndex}
          supabaseUrl={supabaseUrl}
          supabaseKey={supabaseKey}
          // Enhanced persistence props (now supported by enhanced component)
          notificationId={currentNotification.id}
          priorityLevel={currentNotification.priorityLevel}
          handledBy={currentNotification.handledBy}
          handledAt={currentNotification.handledAt}
          expiresAt={currentNotification.expiresAt}
          requiresAction={currentNotification.requiresAction}
        />
      )}
    </>
  );
};

// Enhanced Main App wrapper with NotificationProvider
const App: React.FC<AppProps> = (props) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [userIdentifier, setUserIdentifier] = useState<string>('');
  const [appReady, setAppReady] = useState(false);

  // Initialize app with suppliers and user identifier
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Generate or retrieve device identifier
        const deviceId = NotificationPersistenceService.generateDeviceIdentifier();
        setUserIdentifier(deviceId);
        console.log('App initialized with device identifier:', deviceId);

        // Fetch suppliers
        const { data, error } = await supabase
          .from('suppliers')
          .select('*');
        
        if (!error && data) {
          setSuppliers(data);
          console.log('Suppliers loaded:', data.length);
        } else if (error) {
          console.error('Error loading suppliers:', error);
        }

        setAppReady(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setAppReady(true); // Still allow app to load
      }
    };

    initializeApp();
  }, []);

  // Loading screen while app initializes
  if (!appReady || !userIdentifier) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Initializing MeruScrap...</p>
          <p className="mt-2 text-sm text-gray-500">
            {!userIdentifier ? 'Setting up device profile...' : 'Loading suppliers...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider suppliers={suppliers} userIdentifier={userIdentifier}>
      <AppContent {...props} />
    </NotificationProvider>
  );
};

export default App;