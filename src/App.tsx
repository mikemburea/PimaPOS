// OPTIMIZED: App.tsx - Final Fix for Unmount/Remount Loops (PART 1 of 2)
// This file is split into 2 parts due to length. See Part 2 for the rest.
import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { Menu, X, AlertTriangle, RefreshCw, Wifi, WifiOff, Shield, ShieldCheck, Crown, Users } from 'lucide-react';

// Import enhanced notification system
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import TransactionNotification from './components/dashboard/TransactionNotification';
import { NotificationPersistenceService } from './services/notificationPersistenceService';

// Import updated auth system with first user admin support
import { usePermissions } from './hooks/usePermissions';
import { PermissionService } from './hooks/usePermissions';


// Import your actual component files
const Header = lazy(() => import('./components/common/Header'));
const Sidebar = lazy(() => import('./components/common/Sidebar'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const Suppliers = lazy(() => import('./components/suppliers/Suppliers'));
const Transactions = lazy(() => import('./components/transactions/Transactions'));
const SettingsPage = lazy(() => import('./components/settings/Settings'));
const Analytics = lazy(() => import('./components/analytics/Analytics'));

// Import the real report components
const DailyReport = lazy(() => import('./components/reports/DailyReport'));
const WeeklyReport = lazy(() => import('./components/reports/WeeklyReport'));
const MonthlyReport = lazy(() => import('./components/reports/MonthlyReport'));
const CustomReport = lazy(() => import('./components/reports/CustomReport'));

// ============================================================================
// CRITICAL FIX: Timeout Helper for Fetch Operations
// ============================================================================
const withTimeout = <T,>(
  p: Promise<T>,
  ms = 30000,
  timeoutMessage = 'Request timeout'
): Promise<T> => {
  return Promise.race<T>([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(timeoutMessage)), ms)
    )
  ]);
};

// Storage Monitor interfaces and component (maintaining existing functionality)
interface StorageCleanupResult {
  freedSpace: number;
  itemsRemoved: number;
  timeTaken: number;
  cleanupType: 'manual' | 'automatic';
  categories: {
    notifications: number;
    cache: number;
    logs: number;
    temp: number;
  };
}

interface StorageMonitorProps {
  autoCleanup?: boolean;
  showUI?: boolean;
  threshold?: number;
  onCleanupComplete?: (result: StorageCleanupResult) => void;
  className?: string;
}

// Enhanced Storage Monitor Hook with threshold support
const useStorageMonitor = (autoCleanup: boolean = false, threshold: number = 0.8) => {
  const [storageUsagePercent, setStorageUsagePercent] = useState<number>(0);
  const [needsCleanup, setNeedsCleanup] = useState<boolean>(false);
  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  const calculateStorageUsage = (): number => {
    try {
      let totalUsed = 0;
      let totalQuota = 0;

      if (typeof(Storage) !== "undefined") {
        let localStorageUsed = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            localStorageUsed += localStorage[key].length + key.length;
          }
        }
        totalUsed += localStorageUsed;
        totalQuota += 5 * 1024 * 1024;
      }

      if (typeof(Storage) !== "undefined") {
        let sessionStorageUsed = 0;
        for (let key in sessionStorage) {
          if (sessionStorage.hasOwnProperty(key)) {
            sessionStorageUsed += sessionStorage[key].length + key.length;
          }
        }
        totalUsed += sessionStorageUsed;
        totalQuota += 5 * 1024 * 1024;
      }

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then((estimate) => {
          if (estimate.usage && estimate.quota) {
            const percentage = (estimate.usage / estimate.quota) * 100;
            setStorageUsagePercent(Math.min(percentage, 100));
            setNeedsCleanup(percentage >= threshold * 100);
          }
        }).catch((error) => {
          console.warn('Could not estimate storage:', error);
        });
      }

      const percentage = totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0;
      return Math.min(percentage, 100);
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return 0;
    }
  };

  const cleanupStorage = async (manual: boolean = false): Promise<StorageCleanupResult> => {
    setIsCleaningUp(true);
    const startTime = Date.now();
    let freedSpace = 0;
    let itemsRemoved = 0;
    const categories = { notifications: 0, cache: 0, logs: 0, temp: 0 };

    try {
      const handledDeletedCount = await NotificationPersistenceService.permanentlyDeleteHandledNotifications(1);
      categories.notifications += handledDeletedCount;
      itemsRemoved += handledDeletedCount;

      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('cache_') || 
        key.startsWith('temp_') ||
        key.startsWith('session_')
      );
      
      cacheKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            freedSpace += data.length + key.length;
            localStorage.removeItem(key);
            
            if (key.startsWith('cache_')) categories.cache++;
            else if (key.startsWith('temp_')) categories.temp++;
            else categories.logs++;
            
            itemsRemoved++;
          }
        } catch (error) {
          console.warn(`Could not remove cache key ${key}:`, error);
        }
      });

      const logKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('log_') && 
        key.includes('_') && 
        Date.now() - parseInt(key.split('_')[1]) > 24 * 60 * 60 * 1000
      );

      logKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            freedSpace += data.length + key.length;
            localStorage.removeItem(key);
            categories.logs++;
            itemsRemoved++;
          }
        } catch (error) {
          console.warn(`Could not remove log key ${key}:`, error);
        }
      });

      setLastCleanup(new Date());
      
      setTimeout(() => {
        const newUsage = calculateStorageUsage();
        setStorageUsagePercent(newUsage);
        setNeedsCleanup(newUsage >= threshold * 100);
      }, 100);

      const result: StorageCleanupResult = {
        freedSpace,
        itemsRemoved,
        timeTaken: Date.now() - startTime,
        cleanupType: manual ? 'manual' : 'automatic',
        categories
      };

      console.log('Storage cleanup completed:', result);
      return result;

    } catch (error) {
      console.error('Storage cleanup error:', error);
      throw error;
    } finally {
      setIsCleaningUp(false);
    }
  };

  useEffect(() => {
    if (autoCleanup && needsCleanup && !isCleaningUp) {
      const shouldCleanup = !lastCleanup || 
        Date.now() - lastCleanup.getTime() > 30 * 60 * 1000;
      
      if (shouldCleanup) {
        console.log('Automatic storage cleanup triggered at', storageUsagePercent.toFixed(1), '% usage');
        cleanupStorage(false).catch(console.error);
      }
    }
  }, [autoCleanup, needsCleanup, isCleaningUp, lastCleanup, storageUsagePercent]);

  useEffect(() => {
    const updateUsage = () => {
      const usage = calculateStorageUsage();
      setStorageUsagePercent(usage);
      setNeedsCleanup(usage >= threshold * 100);
    };

    updateUsage();
    const interval = setInterval(updateUsage, 60000);

    return () => clearInterval(interval);
  }, [threshold]);

  return {
    storageUsagePercent,
    needsCleanup,
    isCleaningUp,
    lastCleanup,
    cleanupStorage: () => cleanupStorage(true)
  };
};

// StorageMonitor Component
const StorageMonitor: React.FC<StorageMonitorProps> = ({
  autoCleanup = false,
  showUI = true,
  threshold = 0.8,
  onCleanupComplete,
  className = ""
}) => {
  const {
    storageUsagePercent,
    needsCleanup,
    isCleaningUp,
    lastCleanup,
    cleanupStorage
  } = useStorageMonitor(autoCleanup, threshold);

  const handleManualCleanup = async () => {
    try {
      const result = await cleanupStorage();
      if (onCleanupComplete) {
        onCleanupComplete(result);
      }
    } catch (error) {
      console.error('Manual cleanup failed:', error);
    }
  };

  if (!showUI) {
    return null;
  }

  const getUsageColor = () => {
    if (storageUsagePercent >= 90) return 'text-red-600 bg-red-50';
    if (storageUsagePercent >= 70) return 'text-orange-600 bg-orange-50';
    if (storageUsagePercent >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = () => {
    if (storageUsagePercent >= 90) return 'bg-red-500';
    if (storageUsagePercent >= 70) return 'bg-orange-500';
    if (storageUsagePercent >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Storage Usage</h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor()}`}>
          {Math.round(storageUsagePercent)}% used
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span className="text-red-500">{Math.round(threshold * 100)}%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="space-y-2">
        {needsCleanup && (
          <div className="flex items-center text-xs text-orange-600 bg-orange-50 p-2 rounded">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Storage cleanup recommended</span>
          </div>
        )}

        {lastCleanup && (
          <div className="text-xs text-gray-500">
            Last cleanup: {lastCleanup.toLocaleTimeString()}
          </div>
        )}

        <button
          onClick={handleManualCleanup}
          disabled={isCleaningUp}
          className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
            isCleaningUp
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : needsCleanup
              ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
              : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
          }`}
        >
          {isCleaningUp ? (
            <div className="flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Cleaning up...
            </div>
          ) : (
            'Clean Storage'
          )}
        </button>
      </div>

      {autoCleanup && (
        <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
          Auto-cleanup enabled (threshold: {Math.round(threshold * 100)}%)
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CRITICAL FIX: App Resume Hook with Stronger Debouncing and Timeout
// ============================================================================
const useAppResume = (
  fetchData: () => Promise<void>,
  refreshNotifications: () => Promise<void>,
  skipPermissions: () => Promise<void>
) => {
  const [resumeState, setResumeState] = useState<'idle' | 'resuming' | 'error'>('idle');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const isResuming = useRef(false);
  const lastResumeTime = useRef<number>(0);
  const mountedRef = useRef(true);

  const handleAppResume = useCallback(async () => {
    const now = Date.now();
    
    if (!mountedRef.current) {
      console.log('Component unmounted, skipping resume');
      return;
    }
    
    if (isResuming.current) {
      console.log('Resume already in progress, ignoring...');
      return;
    }
    
    // CRITICAL FIX: 15 second debounce
    if (now - lastResumeTime.current < 15000) {
      console.log('Resume debounced - too soon after last resume (', 
        Math.round((now - lastResumeTime.current) / 1000), 's)');
      return;
    }
    
    isResuming.current = true;
    lastResumeTime.current = now;
    
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    
    // CRITICAL FIX: 20 second timeout
    resumeTimeoutRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Resume timeout - forcing recovery');
        setResumeState('error');
        setResumeError('Resume operation timed out');
        isResuming.current = false;
      }
    }, 20000);
    
    try {
      if (!mountedRef.current) return;
      
      setResumeState('resuming');
      setResumeError(null);
      
      console.log('Starting app resume...');
      
      // CRITICAL FIX: Wrap with timeout
      await withTimeout(fetchData(), 30000, 'Data fetch timed out during resume');
      if (!mountedRef.current) return;
      console.log('Data refresh completed');
      
      await withTimeout(refreshNotifications(), 30000, 'Notifications refresh timed out');
      if (!mountedRef.current) return;
      console.log('Notifications refresh completed');
      
      await skipPermissions();
      if (!mountedRef.current) return;
      console.log('Permission refresh skipped (managed by auth listener)');
      
      if (mountedRef.current) {
        setResumeState('idle');
      }
      
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
      
      console.log('App resume completed successfully');
    } catch (error) {
      console.error('Resume operation failed:', error);
      if (mountedRef.current) {
        setResumeState('error');
        setResumeError(error instanceof Error ? error.message : 'Resume failed');
      }
      
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    } finally {
      isResuming.current = false;
    }
  }, [fetchData, refreshNotifications, skipPermissions]);
  
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      isResuming.current = false;
    };
  }, []);
  
  return {
    resumeState,
    resumeError,
    handleAppResume,
    isResuming: resumeState === 'resuming'
  };
};

const useVisibilityManager = (
  onAppResume: () => Promise<void>,
  authLoading: boolean // CRITICAL: Pass authLoading state
) => {
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const [isWindowFocused, setIsWindowFocused] = useState(document.hasFocus());
  const visibilityTimeoutRef = useRef<number | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const lastResumeAttempt = useRef<number>(0);
  const mountedRef = useRef(true);
  const isResuming = useRef(false);
  const authBlockedCount = useRef<number>(0);
  
  useEffect(() => {
    mountedRef.current = true;
    
    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;
      
      const nowVisible = !document.hidden;
      const wasVisible = isPageVisible;
      setIsPageVisible(nowVisible);
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      
      if (nowVisible !== wasVisible) {
        console.log(`👁️ Visibility changed: ${wasVisible} -> ${nowVisible}`);
      }
      
      // CRITICAL FIX: Only resume when becoming visible
      if (nowVisible && !wasVisible && !isResuming.current) {
        const now = Date.now();
        const timeSinceLastResume = now - lastResumeAttempt.current;
        
        // CRITICAL: Block during authentication
        if (authLoading) {
          authBlockedCount.current++;
          console.log(`🔒 Visibility resume blocked - auth in progress (blocked: ${authBlockedCount.current} times)`);
          return;
        }
        
        // 20 second minimum between attempts
        if (timeSinceLastResume < 20000) {
          console.log(`🔒 Visibility resume throttled - ${Math.round(timeSinceLastResume / 1000)}s since last (need 20s)`);
          return;
        }
        
        console.log('✅ Page visible - scheduling data refresh in 3 seconds...');
        
        visibilityTimeoutRef.current = window.setTimeout(() => {
          if (!mountedRef.current || isResuming.current) {
            console.log('⚠️ Resume cancelled - component state changed');
            return;
          }
          
          // Double-check auth hasn't started
          if (authLoading) {
            authBlockedCount.current++;
            console.log(`🔒 Resume cancelled - auth started during delay (blocked: ${authBlockedCount.current} times)`);
            return;
          }
          
          if (document.hidden) {
            console.log('🔒 Resume cancelled - page no longer visible');
            return;
          }
          
          console.log('🚀 Executing visibility-triggered resume...');
          isResuming.current = true;
          lastResumeAttempt.current = Date.now();
          
          onAppResume().finally(() => {
            if (mountedRef.current) {
              isResuming.current = false;
              console.log('✅ Visibility resume completed');
            }
          });
        }, 3000);
      }
    };
    
    const handleWindowFocus = () => {
      if (!mountedRef.current) return;
      
      const wasFocused = isWindowFocused;
      setIsWindowFocused(true);
      
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      
      if (wasFocused !== true) {
        console.log(`🎯 Window focused`);
      }
      
      // CRITICAL FIX: Separate focus handling
      if (!document.hidden && !wasFocused && !isResuming.current) {
        const now = Date.now();
        const timeSinceLastResume = now - lastResumeAttempt.current;
        
        if (authLoading) {
          authBlockedCount.current++;
          console.log(`🔒 Focus resume blocked - auth in progress (blocked: ${authBlockedCount.current} times)`);
          return;
        }
        
        if (timeSinceLastResume < 20000) {
          console.log(`🔒 Focus resume throttled - ${Math.round(timeSinceLastResume / 1000)}s since last (need 20s)`);
          return;
        }
        
        console.log('✅ Window focused - scheduling refresh in 3 seconds...');
        
        focusTimeoutRef.current = window.setTimeout(() => {
          if (!mountedRef.current || isResuming.current) {
            console.log('⚠️ Focus resume cancelled - component state changed');
            return;
          }
          
          if (authLoading) {
            authBlockedCount.current++;
            console.log(`🔒 Focus resume cancelled - auth started (blocked: ${authBlockedCount.current} times)`);
            return;
          }
          
          if (document.hidden || !document.hasFocus()) {
            console.log('🔒 Focus resume cancelled - focus/visibility changed');
            return;
          }
          
          console.log('🚀 Executing focus-triggered resume...');
          isResuming.current = true;
          lastResumeAttempt.current = Date.now();
          
          onAppResume().finally(() => {
            if (mountedRef.current) {
              isResuming.current = false;
              console.log('✅ Focus resume completed');
            }
          });
        }, 3000);
      }
    };
    
    const handleWindowBlur = () => {
      if (!mountedRef.current) return;
      
      const wasFocused = isWindowFocused;
      setIsWindowFocused(false);
      
      if (wasFocused) {
        console.log('👋 Window blurred');
      }
      
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
        console.log('🚫 Cancelled pending focus resume due to blur');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    console.log('🎬 Visibility manager initialized:', {
      visible: !document.hidden,
      focused: document.hasFocus(),
      authLoading
    });
    
    return () => {
      mountedRef.current = false;
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      isResuming.current = false;
      console.log('🛑 Visibility manager cleaned up');
    };
  }, [onAppResume, authLoading]); // CRITICAL: Include authLoading in deps
  
  return { isPageVisible, isWindowFocused };
};

const useLoadingWatchdog = (
  loading: boolean,
  setLoading: (val: boolean) => void,
  setError: (msg: string) => void
) => {
  useEffect(() => {
    let loadingWatch: number | null = null;
    
    if (loading) {
      loadingWatch = window.setTimeout(() => {
        if (loading) {
          console.warn('⚠️ Loading stuck >30s, clearing loading state to recover UI');
          setLoading(false);
          setError('Timed out while loading — try refreshing.');
        }
      }, 30000);
    }
    
    return () => {
      if (loadingWatch) clearTimeout(loadingWatch);
    };
  }, [loading, setLoading, setError]);
};

// Enhanced Transaction interface matching your actual database schema (maintaining existing structure)
interface Transaction {
  id: string;
  transaction_type: 'Purchase' | 'Sale';
  
  // Common fields
  supplier_id?: string | null;
  material_type: string;
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
  customer_name: string;
  customer_phone?: string | null;
  
  // Purchase-specific fields
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
  
  // Sales-specific fields
  transaction_id?: string;
  material_id?: number | null;
  material_name?: string;
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

// Analytics component compatible types (maintaining existing structure)
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

// Enhanced Connection Status Component (maintaining existing functionality)
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

// Enhanced Recovery Component (maintaining existing functionality)
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
      console.log('Starting emergency notification recovery (UNHANDLED ONLY)...');
      
      const stats = await NotificationPersistenceService.getNotificationStats();
      setRecoveryStats(stats);
      
      const recoveredNotifications = await NotificationPersistenceService.emergencyRecovery();
      
      const unhandledOnly = recoveredNotifications.filter(n => {
        if (n.is_handled === true) {
          console.error(`CRITICAL: Handled notification ${n.id} in recovery - blocking`);
          return false;
        }
        const handledKey = `handled_${n.id}`;
        if (localStorage.getItem(handledKey)) {
          console.log(`Excluding handled notification ${n.id} from recovery (localStorage check)`);
          return false;
        }
        return true;
      });
      
      console.log(`Emergency recovery completed: ${unhandledOnly.length} UNHANDLED notifications recovered (filtered from ${recoveredNotifications.length})`);
      
      onRecovery();
      
      setTimeout(() => {
        alert(`Recovery Complete!\n\nRecovered ${unhandledOnly.length} unhandled notifications.\n\nStats:\n- Total: ${stats.total}\n- Pending: ${stats.pending}\n- Handled: ${stats.handled} (excluded from recovery)`);
      }, 500);
      
    } catch (error) {
      console.error('Emergency recovery failed:', error);
      alert('Recovery failed. Check your connection and try again.');
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
            <p className="text-xs text-gray-600">Restore unhandled notifications only</p>
          </div>
        </div>
        
        {recoveryStats && (
          <div className="text-xs text-gray-600 mb-3 space-y-1 bg-gray-50 rounded p-2">
            <div className="flex justify-between">
              <span>Pending (Recoverable):</span>
              <span className="font-medium text-green-600">{recoveryStats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>Handled (Excluded):</span>
              <span className="font-medium text-red-600">{recoveryStats.handled}</span>
            </div>
            <div className="flex justify-between">
              <span>Total in System:</span>
              <span className="font-medium">{recoveryStats.total}</span>
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
            'Recover Unhandled Notifications'
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Restores only unhandled transactions from the last 48 hours
        </p>
        <p className="text-xs text-red-500 mt-1 text-center font-medium">
          Handled notifications are permanently excluded
        </p>
      </div>
    </div>
  );
};

// Enhanced Navigation Blocked Warning (maintaining existing functionality)
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

// FIXED: Loading component that doesn't interfere with resume logic
const LoadingSpinner = ({ message = "Loading data..." }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-screen px-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-3 md:mt-4 text-gray-600 text-sm md:text-base">{message}</p>
    </div>
  </div>
);

// UPDATED: Enhanced ErrorDisplay with recovery options
const ErrorDisplay = ({ 
  error, 
  onRetry,
  onForceRecovery 
}: { 
  error: string; 
  onRetry: () => void;
  onForceRecovery?: () => void;
}) => (
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
        <div className="space-y-2">
          <button 
            onClick={onRetry}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 md:px-4 rounded transition-colors text-sm md:text-base"
          >
            Retry
          </button>
          {onForceRecovery && (
            <button 
              onClick={onForceRecovery}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 md:px-4 rounded transition-colors text-sm md:text-base"
            >
              Force Recovery
            </button>
          )}
        </div>
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

// Permission-denied component with first user admin info
const PermissionDenied = ({ 
  requiredRole, 
  userRole, 
  onReturnToDashboard,
  isFirstUser,
  systemStats 
}: { 
  requiredRole?: string;
  userRole: string;
  onReturnToDashboard: () => void;
  isFirstUser?: boolean;
  systemStats?: any;
}) => (
  <div className="flex items-center justify-center min-h-screen px-4">
    <div className="text-center bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-4">
        You don't have permission to access this feature.
      </p>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Your Role:</strong> {userRole === 'admin' ? 'Administrator' : 'User'}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <strong>Available Features:</strong>
        </p>
        <div className="text-sm text-gray-600">
          {userRole === 'admin' ? (
            <span>All features available</span>
          ) : (
            <ul className="text-left space-y-1">
              <li>• Dashboard</li>
              <li>• Add/View Suppliers</li>
              <li>• Add/View Materials</li>
            </ul>
          )}
        </div>
      </div>

      {/* First User Admin Info */}
      {isFirstUser && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center mb-2">
            <Crown className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-purple-900 font-medium">First User Admin</span>
          </div>
          <p className="text-sm text-purple-700">
            The first person to register becomes the administrator automatically.
          </p>
        </div>
      )}

      {/* System Stats Info */}
      {systemStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-900 font-medium">System Status</span>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p>Total Users: {systemStats.totalUsers}</p>
            <p>Administrators: {systemStats.adminCount}</p>
            <p>Status: {systemStats.hasAdmin ? 'Admin Present' : 'No Admin'}</p>
          </div>
        </div>
      )}
      
      <button 
        onClick={onReturnToDashboard}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
);

// Transform functions for Analytics compatibility (maintaining existing functionality)
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

// Helper function to convert activeTab to proper title for Header
const getPageTitle = (activeTab: string): string => {
  switch (activeTab) {
    case 'dashboard':
      return 'MeruScrap Dashboard';
    case 'transactions':
      return 'Transactions';
    case 'suppliers':
      return 'Suppliers';
    case 'materials':
      return 'Materials';
    case 'analytics':
      return 'Analytics';
    case 'settings':
      return 'Settings';
    case 'reports-daily':
      return 'Daily Reports';
    case 'reports-weekly':
      return 'Weekly Reports';
    case 'reports-monthly':
      return 'Monthly Reports';
    case 'reports-custom':
      return 'Custom Reports';
    default:
      return 'MeruScrap';
  }
};

// FIXED: Main App Component - Final version with unmount loop prevention
const AppContent: React.FC<AppProps> = ({ onNavigateBack }) => {
  // Get enhanced notification context (maintaining existing functionality)
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
    sessionInfo,
    bellNotifications,
    unreadBellCount
  } = useNotifications();

  // Get user permissions using the updated auth system with first user admin support
  const {
    user,
    loading: authLoading,  // ⭐ Extract this explicitly
    profile,
    role: userRole,
    isAdmin,
    hasPermission,
    canNavigateTo,
    permissions,
    isFirstUser,
    userStats,
    refreshPermissions
  } = usePermissions();

  // Initialize storage monitoring with threshold (maintaining existing functionality)
  const { storageUsagePercent, needsCleanup } = useStorageMonitor(true, 0.8);

  // FIXED: Simplified state management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Data state (maintaining existing structure)
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
  
  // FIXED: Loading state management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  
  // CRITICAL FIX: Refs to prevent loops and track state
  const initialFetchComplete = useRef(false);
  const fetchInProgress = useRef(false);
  const dataInitialized = useRef(false);
  const authEventHandled = useRef(false);
  const appInitialized = useRef(false);

  // FIXED: Enhanced data fetching with proper state tracking
  const fetchData = useCallback(async () => {
    // CRITICAL FIX: Prevent concurrent fetches
    if (fetchInProgress.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    
    fetchInProgress.current = true;
    
    try {
      console.log('Starting data fetch...');

      // Use Promise.allSettled to handle individual failures gracefully
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

      let hasErrors = false;
      let errorMessages: string[] = [];

      // Handle suppliers
      let suppliersData: Supplier[] = [];
      if (suppliersResult.status === 'fulfilled') {
        if (suppliersResult.value.error) {
          console.error('Error fetching suppliers:', suppliersResult.value.error);
          hasErrors = true;
          errorMessages.push('suppliers');
        } else {
          suppliersData = suppliersResult.value.data || [];
          console.log('App: Fetched suppliers:', suppliersData.length);
          setSuppliers(suppliersData);
        }
      } else {
        console.error('Suppliers fetch rejected:', suppliersResult.reason);
        hasErrors = true;
        errorMessages.push('suppliers');
      }

      // Transform and combine transactions (maintaining existing logic)
      const purchaseData = transactionsResult.status === 'fulfilled' && !transactionsResult.value.error 
        ? transactionsResult.value.data || [] 
        : [];
      
      const salesData = salesTransactionsResult.status === 'fulfilled' && !salesTransactionsResult.value.error 
        ? salesTransactionsResult.value.data || [] 
        : [];

      if (transactionsResult.status === 'rejected' || (transactionsResult.status === 'fulfilled' && transactionsResult.value.error)) {
        hasErrors = true;
        errorMessages.push('purchase transactions');
      }

      if (salesTransactionsResult.status === 'rejected' || (salesTransactionsResult.status === 'fulfilled' && salesTransactionsResult.value.error)) {
        hasErrors = true;
        errorMessages.push('sales transactions');
      }

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
          hasErrors = true;
          errorMessages.push('materials');
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
      } else {
        hasErrors = true;
        errorMessages.push('materials');
      }

      // Calculate stats
      calculateStats(allTransactions, suppliersData);
      setLastSyncTime(new Date());
      
      // CRITICAL FIX: Mark as initialized
      dataInitialized.current = true;
      
      if (!initialFetchComplete.current) {
        initialFetchComplete.current = true;
      }

      // Show partial error message if some data failed to load
      if (hasErrors) {
        const failedItems = errorMessages.join(', ');
        setError(`Some data failed to load: ${failedItems}. App is partially functional.`);
        console.warn('Partial data fetch failure:', errorMessages);
      } else {
        setError(null); // Clear any existing errors
        console.log('Data fetch completed successfully');
      }

    } catch (err) {
      console.error('Critical error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      // CRITICAL FIX: Always release the lock
      fetchInProgress.current = false;
    }
  }, []);

  // CRITICAL FIX: Skip permission refresh on app resume
  const skipPermissionRefresh = useCallback(async () => {
    console.log('⏭️ Skipping permission refresh on app resume (prevents auth loop)');
    // Permissions are managed by their own auth listener in usePermissions.ts
  }, []);

  const { resumeState, resumeError, handleAppResume, isResuming } = useAppResume(
    fetchData,
    refreshNotifications,
    skipPermissionRefresh
  );

  // FIXED: Initialize visibility management with proper dependencies
 // b) Initialize useVisibilityManager with authLoading:
const { isPageVisible, isWindowFocused } = useVisibilityManager(handleAppResume, authLoading);
 // ⭐ ADD LOADING WATCHDOG HERE (NEW)
  useLoadingWatchdog(loading, setLoading, setError);

  // Enhanced calculate dashboard stats (maintaining existing functionality)
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

  // Handle recovery action (maintaining existing functionality)
  const handleRecoveryAction = async () => {
    setShowRecovery(false);
    try {
      console.log('Triggering notification recovery (UNHANDLED ONLY)...');
      
      await NotificationPersistenceService.permanentlyDeleteHandledNotifications(0.5);
      await refreshNotifications();
      
      console.log('Notifications refreshed from persistent storage (handled excluded)');
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  // FIXED: Force recovery function for critical failures
  const handleForceRecovery = useCallback(async () => {
    console.log('Force recovery initiated...');
    
    // Reset all states
    setLoading(false);
    setError(null);
    authEventHandled.current = false;
    
    // Clear browser state that might be causing issues
    try {
      // Clear relevant localStorage entries that might be corrupted
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('temp_') || 
        key.startsWith('cache_') ||
        key.startsWith('session_') ||
        key.startsWith('auth_')
      );
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Could not remove key:', key);
        }
      });
      
      console.log('Cleared potentially corrupted browser storage');
    } catch (error) {
      console.error('Error during storage cleanup:', error);
    }
    
    // Force refresh all data
    setTimeout(() => {
      fetchData();
      refreshNotifications();
    }, 1000);
  }, [fetchData, refreshNotifications]);

 useEffect(() => {
  let onlineTimeout: number | null = null;

  const handleOnline = () => {
    setIsOnline(true);
    console.log('App came online, syncing...');
    setError(null);
    
    if (onlineTimeout) {
      clearTimeout(onlineTimeout);
      onlineTimeout = null;
    }
    
    // CRITICAL FIX: Only sync data and notifications, NOT permissions
    if (dataInitialized.current && !isResuming && !loading && !authLoading) {
      onlineTimeout = window.setTimeout(() => {
        fetchData();
        refreshNotifications();
      }, 3000);
    }
  };
  
  const handleOffline = () => {
    setIsOnline(false);
    console.log('App went offline');
    setError('Connection lost - some features may be limited');
    
    if (onlineTimeout) {
      clearTimeout(onlineTimeout);
      onlineTimeout = null;
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    
    if (onlineTimeout) {
      clearTimeout(onlineTimeout);
    }
  };
}, [refreshNotifications, isResuming, loading, authLoading, fetchData]);

  // Initialize mobile detection (maintaining existing functionality)
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

  // Initialize notification persistence system (maintaining existing functionality)
  useEffect(() => {
    console.log('Initializing notification persistence system...');
    
    const stopCleanup = NotificationPersistenceService.startPeriodicCleanup(30);
    
    const cleanupHandledOnStartup = async () => {
      try {
        const deletedCount = await NotificationPersistenceService.permanentlyDeleteHandledNotifications(0.5);
        if (deletedCount > 0) {
          console.log(`[App] Cleaned up ${deletedCount} handled notifications on startup`);
        }
      } catch (error) {
        console.error('Error cleaning up handled notifications on startup:', error);
      }
    };
    
    cleanupHandledOnStartup();
    
    const checkForUnhandledNotifications = async () => {
      try {
        const pendingNotifications = await NotificationPersistenceService.getPendingNotifications();
        
        console.log(`Startup check: ${pendingNotifications.length} pending notifications found`);
        
        if (pendingNotifications.length > 0) {
          console.log(`Found ${pendingNotifications.length} pending notifications from previous session`);
          setShowRecovery(true);
          
          setTimeout(() => {
            if (showRecovery) {
              console.log('Auto-triggering notification recovery for UNHANDLED notifications...');
              handleRecoveryAction();
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Error checking for unhandled notifications:', error);
      }
    };

    setTimeout(checkForUnhandledNotifications, 2000);

    return () => {
      stopCleanup();
    };
  }, []);

  // Initialize bell notifications on startup (maintaining existing functionality)
  useEffect(() => {
    setTimeout(() => {
      refreshNotifications();
    }, 1000);
  }, [refreshNotifications]);

  useEffect(() => {
  // CRITICAL FIX: Only initialize once
  if (appInitialized.current) {
    console.log('🛑 App already initialized, skipping re-initialization');
    return;
  }

  // Only fetch if auth loaded and data not initialized
  if (!authLoading && !dataInitialized.current && !fetchInProgress.current) {
    console.log('🚀 Starting app initialization...');
    
    const initializeData = async () => {
      setLoading(true);
      try {
        // CRITICAL FIX: Wrap with timeout
        await withTimeout(fetchData(), 30000, 'Initial data fetch timed out after 30s');
        appInitialized.current = true;
        dataInitialized.current = true;
        console.log('✅ App initialization completed');
      } catch (error) {
        console.error('Initial data fetch failed:', error);
        setError('Failed to load initial data');
      } finally {
        setLoading(false); // CRITICAL: Ensure spinner is cleared
      }
    };
    
    initializeData();
  } else if (authLoading) {
    console.log('🔄 Auth still loading...');
  } else if (dataInitialized.current) {
    setLoading(false);
  }
}, [authLoading, fetchData]);

  // OPTIMIZED: Memoized user permissions to prevent excessive re-renders
  const userPermissions = useMemo(() => ({
    canViewTransactions: hasPermission('transactions'),
    canViewSuppliers: hasPermission('suppliers'),
    canViewMaterials: hasPermission('materials'),
    canViewAnalytics: hasPermission('analytics'),
    canViewReports: hasPermission('reports'),
    isAdmin,
    isFirstUser,
    userStats
  }), [hasPermission, isAdmin, isFirstUser, userStats]);

  // Enhanced tab change handler with role-based navigation blocking and first user admin logic
  const handleTabChange = (tab: string) => {
    // First check notification blocking (existing functionality)
    if (!attemptNavigation(tab)) {
      return;
    }

    // Then check user permissions with first user admin support
    if (!canNavigateTo(tab)) {
      console.warn(`Access denied to ${tab} for user role: ${userRole}`);
      
      // Enhanced permission message with first user admin info
      let permissionMessage = `You don't have permission to access this feature.`;
      
      if (isFirstUser) {
        permissionMessage = `This feature requires administrator privileges. As the first user, you'll automatically become an admin when you sign up!`;
      } else if (isAdmin) {
        permissionMessage = 'This feature is temporarily unavailable.';
      } else {
        permissionMessage = `Your current role (${userRole}) allows access to: ${permissions.join(', ')}. Contact your administrator for additional access.`;
      }
      
      // Create enhanced notification with first user admin info
      const notificationDiv = document.createElement('div');
      notificationDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[70] bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl max-w-md';
      notificationDiv.innerHTML = `
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-medium">Access Denied</span>
              ${isFirstUser ? '<span class="text-xs bg-purple-500 px-2 py-1 rounded">First User</span>' : ''}
            </div>
            <p class="text-xs">${permissionMessage}</p>
            ${isFirstUser ? '<p class="text-xs mt-1 opacity-90">Sign up to become the first administrator!</p>' : ''}
          </div>
        </div>
      `;
      
      document.body.appendChild(notificationDiv);
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        if (document.body.contains(notificationDiv)) {
          document.body.removeChild(notificationDiv);
        }
      }, 5000);
      
      return;
    }
    
    setActiveTab(tab);
    if (isMobile) {
      setSidebarOpen(false);
      setReportsOpen(false);
    }
  };

  // Enhanced navigation handlers for Dashboard with permission checks and first user admin awareness
  const handleNavigateToTransactions = () => {
    console.log('Navigating to transactions from dashboard');
    if (!hasPermission('transactions')) {
      const message = isFirstUser 
        ? 'Transactions require admin access. Sign up as the first user to become an administrator!'
        : 'You don\'t have permission to view transactions. Contact your administrator if you need access.';
      alert(message);
      return;
    }
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
    if (!hasPermission('suppliers')) {
      const message = isFirstUser
        ? 'Sign up as the first user to get full access to supplier management!'
        : 'You don\'t have permission to view suppliers.';
      alert(message);
      return;
    }
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
    if (!hasPermission('suppliers')) {
      const message = isFirstUser
        ? 'Sign up as the first user to start adding suppliers!'
        : 'You don\'t have permission to add suppliers.';
      alert(message);
      return;
    }
    if (attemptNavigation('suppliers')) {
      setActiveTab('suppliers');
      if (isMobile) {
        setSidebarOpen(false);
        setReportsOpen(false);
      }
    }
  };

  const handleNavigateToMaterials = () => {
    console.log('Navigating to materials');
    if (!hasPermission('materials')) {
      const message = isFirstUser
        ? 'Sign up as the first user to manage materials!'
        : 'You don\'t have permission to view materials.';
      alert(message);
      return;
    }
    if (attemptNavigation('materials')) {
      setActiveTab('materials');
      if (isMobile) {
        setSidebarOpen(false);
        setReportsOpen(false);
      }
    }
  };

  // Enhanced logout with navigation check (maintaining existing functionality)
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

  // Enhanced notification click handler (maintaining existing functionality)
  const handleNotificationClick = async () => {
    const totalCount = getUnhandledCount() + unreadBellCount;
    console.log('Notifications clicked - total count:', totalCount, 'unhandled:', getUnhandledCount(), 'bell:', unreadBellCount);
    
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

  // Emergency recovery handler (maintaining existing functionality)
  const handleEmergencyRecovery = async () => {
    try {
      console.log('Emergency recovery triggered - recovering UNHANDLED notifications only');
      
      const pendingNotifications = await NotificationPersistenceService.getPendingNotifications();
      
      console.log(`Found ${pendingNotifications.length} pending notifications for recovery`);
      
      await refreshNotifications();
      
      console.log('Emergency recovery completed - handled notifications excluded');
    } catch (error) {
      console.error('Emergency recovery failed:', error);
    }
  };

  // Transform transactions for reports (maintaining existing functionality)
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

  // FIXED: Enhanced content renderer with proper loading state management
 const renderContent = () => {
  // Show loading spinner for initial load or auth loading, but not for resume
  if ((loading && !isResuming) || authLoading) {
    return <LoadingSpinner message={authLoading ? "Authenticating..." : "Loading data..."} />;
  }
  
  // Show error if there's an error (but allow resume error to be handled separately)
  if (error && resumeState !== 'error') {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => {
          setError(null);
          fetchData();
        }}
        onForceRecovery={handleForceRecovery}
      />
    );
  }

  // Check if user has permission for the current tab with first user admin support
  if (!canNavigateTo(activeTab)) {
    return (
      <PermissionDenied 
        requiredRole={activeTab}
        userRole={userRole}
        onReturnToDashboard={() => setActiveTab('dashboard')}
        isFirstUser={isFirstUser}
        systemStats={userStats}
      />
    );
  }
  
  // OPTIMIZED: Wrap all route content in Suspense for code splitting
  return (
    <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return (
              <Dashboard 
                onRefresh={fetchData}
                onNavigateToTransactions={handleNavigateToTransactions}
                onNavigateToSuppliers={handleNavigateToSuppliers}
                onNavigateToAddSupplier={handleNavigateToAddSupplier}
                onNavigateToMaterials={handleNavigateToMaterials}
                userPermissions={userPermissions}
              />
            );
            
          case 'transactions':
            return hasPermission('transactions') ? (
              <Transactions 
                onTransactionUpdate={handleTransactionUpdate} 
                transactions={transactions} 
              />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')} 
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'suppliers':
            return hasPermission('suppliers') ? (
              <Suppliers onSupplierUpdate={handleSupplierUpdate} />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'materials':
            return hasPermission('materials') ? (
              <MaterialsPage />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'analytics':
            return hasPermission('analytics') ? (
              <Analytics 
                suppliers={transformSuppliersForAnalytics(suppliers)}
                materials={transformMaterialsForAnalytics(materials)}
                salesTransactions={transformSalesTransactionsForAnalytics(transactions)}
              />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'reports-daily':
            return hasPermission('reports') ? (
              <DailyReport currentDate={new Date()} />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'reports-weekly':
            return hasPermission('reports') ? (
              <WeeklyReport weekStartDate={new Date()} />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'reports-monthly':
            return hasPermission('reports') ? (
              <MonthlyReport month={new Date()} />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'reports-custom':
            return hasPermission('reports') ? (
              <CustomReport />
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          case 'settings':
            return hasPermission('settings') ? (
              <div>
                <SettingsPage />
                
                {/* Storage Monitor in Settings with role-aware features */}
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Management</h3>
                  <StorageMonitor 
                    autoCleanup={false} 
                    showUI={true}
                    threshold={0.7}
                    onCleanupComplete={(result) => {
                      console.log('Manual storage cleanup completed:', result);
                      alert(`Cleanup completed!\n\nFreed space: ${result.freedSpace}KB\nItems removed: ${result.itemsRemoved}\nTime taken: ${result.timeTaken}ms`);
                    }}
                  />
                </div>
                
                {/* System Status for Admins */}
                {isAdmin && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600 mr-2" />
                            <span className="text-2xl font-bold text-gray-900">{userStats.totalUsers}</span>
                          </div>
                          <p className="text-sm text-gray-600">Total Users</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center">
                            <Crown className="w-5 h-5 text-purple-600 mr-2" />
                            <span className="text-2xl font-bold text-gray-900">{userStats.adminCount}</span>
                          </div>
                          <p className="text-sm text-gray-600">Administrators</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {userStats.adminCount > 0 ? 'Secured' : 'Unsecured'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">System Status</p>
                        </div>
                      </div>
                      {isFirstUser && (
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center">
                            <Crown className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-purple-900">
                              First User Admin System Active
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <PermissionDenied 
                userRole={userRole} 
                onReturnToDashboard={() => setActiveTab('dashboard')}
                isFirstUser={isFirstUser}
                systemStats={userStats}
              />
            );
            
          default:
            return (
              <Dashboard 
                onRefresh={fetchData}
                onNavigateToTransactions={handleNavigateToTransactions}
                onNavigateToSuppliers={handleNavigateToSuppliers}
                onNavigateToAddSupplier={handleNavigateToAddSupplier}
                onNavigateToMaterials={handleNavigateToMaterials}
                userPermissions={userPermissions}
              />
            );
        }
      })()}
    </Suspense>
  );
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
        {/* Connection Status (maintaining existing functionality) */}
        <ConnectionStatus isOnline={isOnline} />

        {/* Enhanced Navigation Blocked Warning with Recovery (maintaining existing functionality) */}
        {isNavigationBlocked && (
          <NavigationBlockedWarning 
            unhandledCount={getUnhandledCount()} 
            onEmergencyRecovery={handleEmergencyRecovery}
          />
        )}

        {/* FIXED: Resume Loading Indicator - only shows during resume, not initial load */}
        {isResuming && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Refreshing data...</span>
            </div>
          </div>
        )}

        {/* Resume Error Indicator */}
        {resumeError && (
          <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-[60] bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Resume failed: {resumeError}</span>
              <button 
                onClick={handleForceRecovery}
                className="ml-2 px-2 py-1 bg-orange-700 hover:bg-orange-800 rounded text-xs"
              >
                Recover
              </button>
            </div>
          </div>
        )}

        {/* Enhanced role indicator for development with first user admin info */}
        {process.env.NODE_ENV === 'development' && !authLoading && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[60] bg-black text-white text-xs p-2 rounded max-w-xs">
            <div className="flex items-center gap-2">
              {isAdmin ? <ShieldCheck className="w-3 h-3" /> : isFirstUser ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              <span>Role: {userRole}</span>
              <span>•</span>
              <span>Admin: {isAdmin ? 'Yes' : 'No'}</span>
              {isFirstUser && (
                <>
                  <span>•</span>
                  <span className="text-purple-300">First User</span>
                </>
              )}
              <span>•</span>
              <span>Perms: {permissions.length}</span>
            </div>
            {(isFirstUser || userStats.totalUsers === 0) && (
              <div className="text-purple-300 text-xs mt-1">
                Users: {userStats.totalUsers} | Admins: {userStats.adminCount}
              </div>
            )}
            <div className="text-yellow-300 text-xs mt-1">
              Visible: {isPageVisible ? 'Yes' : 'No'} | Focused: {isWindowFocused ? 'Yes' : 'No'} | Resume: {resumeState}
            </div>
          </div>
        )}

        {/* Development session info with first user admin details - only show in development mode */}
        {process.env.NODE_ENV === 'development' && sessionInfo && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-black text-white text-xs p-2 rounded max-w-xs">
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3" />
              <span>Session: {sessionInfo.sessionId.slice(-8)}</span>
              <span>•</span>
              <span>Queue: {notificationQueue.length}</span>
              <span>•</span>
              <span>Bell: {bellNotifications.length}</span>
            </div>
          </div>
        )}

        {/* Recovery Component (maintaining existing functionality) */}
        <RecoveryComponent onRecovery={handleRecoveryAction} isVisible={showRecovery} />

        {/* Critical Storage Warning (maintaining existing functionality) */}
        {storageUsagePercent > 90 && (
          <div className="fixed bottom-4 left-4 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl max-w-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Storage Critical</p>
                <p className="text-xs opacity-90">
                  {Math.round(storageUsagePercent)}% full - Auto-cleanup active
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Overlay (maintaining existing functionality) */}
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

        {/* Enhanced Sidebar Component with role-based navigation and first user admin support */}
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
          {/* Enhanced Header with proper props matching interface */}
          <div className="relative">
            <Header
              title={getPageTitle(activeTab)}
              userName={`${profile?.full_name || 'User'} ${isAdmin ? '(Admin)' : isFirstUser ? '(First User)' : '(User)'}`}
              showNotifications={true}
              notificationCount={getUnhandledCount()}
              onNotificationClick={handleNotificationClick}
              onProfileClick={handleProfileClick}
            />
            
            {/* Mobile Menu Button (maintaining existing functionality) */}
            <MobileMenuButton isOpen={sidebarOpen} onClick={toggleSidebar} />
          </div>

          {/* Content with enhanced role-based access control and first user admin support */}
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

      {/* Silent Storage Monitor with proper threshold support (maintaining existing functionality) */}
      <StorageMonitor 
        autoCleanup={true} 
        showUI={false} 
        threshold={0.8} // Start cleanup at 80% storage usage
        onCleanupComplete={(result) => {
          console.log('Automatic storage cleanup completed:', result);
        }}
      />

      {/* Production-ready Transaction Notification Modal (maintaining existing functionality) */}
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
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
        />
      )}
    </>
  );
};

// Enhanced Main App wrapper with NotificationProvider and first user admin initialization
const App: React.FC<AppProps> = (props) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [userIdentifier, setUserIdentifier] = useState<string>('');
  const [appReady, setAppReady] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    hasAdmin: false
  });

  // Initialize storage monitoring with threshold (maintaining existing functionality)
  const { storageUsagePercent, needsCleanup } = useStorageMonitor(true, 0.8);

  // Initialize app with suppliers, user identifier, and first user admin status
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing MeruScrap with First User Admin support...');
        
        const deviceId = NotificationPersistenceService.generateDeviceIdentifier();
        setUserIdentifier(deviceId);
        console.log('📱 App initialized with device identifier:', deviceId);

        // Get system statistics for first user admin detection
        try {
          const stats = await PermissionService.getSystemStats();
          setSystemStats(stats);
          console.log('📊 System statistics loaded:', {
            totalUsers: stats.totalUsers,
            adminCount: stats.adminCount,
            hasAdmin: stats.hasAdmin,
            firstAdmin: stats.firstAdminEmail
          });
          
          if (!stats.hasAdmin && stats.totalUsers === 0) {
            console.log('🎯 System ready for first user admin setup');
          } else if (stats.adminCount > 0) {
            console.log('👑 Admin users present:', stats.adminCount);
          }
        } catch (error) {
          console.error('Error loading system stats:', error);
        }

        // Load suppliers
        const { data, error } = await supabase
          .from('suppliers')
          .select('*');
        
        if (!error && data) {
          setSuppliers(data);
          console.log('📋 Suppliers loaded:', data.length);
        } else if (error) {
          console.error('Error loading suppliers:', error);
        }

        setAppReady(true);
        console.log('✅ MeruScrap initialization complete');
      } catch (error) {
        console.error('Error initializing app:', error);
        setAppReady(true);
      }
    };

    initializeApp();
  }, []);

  // Enhanced loading screen while app initializes with first user admin info
  if (!appReady || !userIdentifier) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Initializing MeruScrap...</p>
          <div className="mt-2 text-sm text-gray-500 space-y-1">
            {!userIdentifier && <p>Setting up device profile...</p>}
            {!appReady && <p>Loading suppliers...</p>}
            {systemStats.totalUsers === 0 && (
              <p className="text-purple-600 font-medium">Preparing first user admin setup...</p>
            )}
          </div>
          {storageUsagePercent > 70 && (
            <p className="mt-1 text-xs text-orange-600">
              Storage: {Math.round(storageUsagePercent)}% used - Optimizing...
            </p>
          )}
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Loading role-based access control...</span>
            </div>
            
            {systemStats.totalUsers === 0 && (
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-500">First User Admin system ready</span>
              </div>
            )}
            
            {systemStats.adminCount > 0 && (
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-500">{systemStats.adminCount} admin{systemStats.adminCount > 1 ? 's' : ''} active</span>
              </div>
            )}
          </div>
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