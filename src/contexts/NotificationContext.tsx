// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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

export interface NotificationData {
  transaction: Transaction;
  suppliers: Supplier[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  isHandled: boolean;
  id: string; // Unique ID for tracking
  timestamp: string;
}

interface NotificationContextType {
  notificationQueue: NotificationData[];
  currentNotificationIndex: number;
  isNotificationVisible: boolean;
  hasUnhandledNotifications: boolean;
  
  // Navigation blocking
  isNavigationBlocked: boolean;
  attemptedNavigation: string | null;
  
  // Methods
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled'>) => void;
  dismissCurrentNotification: () => void;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  markCurrentAsHandled: () => void;
  attemptNavigation: (destination: string) => boolean;
  clearAttemptedNavigation: () => void;
  getUnhandledCount: () => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  suppliers: Supplier[];
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, suppliers }) => {
  const [notificationQueue, setNotificationQueue] = useState<NotificationData[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [attemptedNavigation, setAttemptedNavigation] = useState<string | null>(null);

  // Calculate if there are unhandled notifications
  const hasUnhandledNotifications = notificationQueue.some(n => !n.isHandled);
  const isNavigationBlocked = hasUnhandledNotifications && isNotificationVisible;

  // Subscribe to Supabase real-time updates
  useEffect(() => {
    // Create subscription for transactions table
    const subscription = supabase
      .channel('transactions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction change received:', payload);
          
          // Handle different event types
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const transaction = payload.new as Transaction || payload.old as Transaction;
            
            if (transaction) {
              addNotification({
                transaction,
                suppliers,
                eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
              });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [suppliers]);

  // Add notification to queue
  const addNotification = (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      isHandled: false
    };

    setNotificationQueue(prev => [...prev, newNotification]);
    
    // Always show notification panel when new notification arrives
    setIsNotificationVisible(true);
    
    // If this is the first notification, set index to 0
    // Otherwise keep current index (user might be reviewing others)
    if (notificationQueue.length === 0) {
      setCurrentNotificationIndex(0);
    }
  };

  // Dismiss current notification (close panel)
  const dismissCurrentNotification = () => {
    setIsNotificationVisible(false);
    
    // Clean up handled notifications after closing
    setTimeout(() => {
      const remainingUnhandled = notificationQueue.filter(n => !n.isHandled);
      if (remainingUnhandled.length === 0) {
        setNotificationQueue([]);
        setCurrentNotificationIndex(0);
      }
    }, 300);
  };

  // Navigate to next notification
  const navigateToNext = () => {
    if (currentNotificationIndex < notificationQueue.length - 1) {
      setCurrentNotificationIndex(currentNotificationIndex + 1);
    }
  };

  // Navigate to previous notification
  const navigateToPrevious = () => {
    if (currentNotificationIndex > 0) {
      setCurrentNotificationIndex(currentNotificationIndex - 1);
    }
  };

  // Mark current notification as handled
  const markCurrentAsHandled = () => {
    if (!notificationQueue[currentNotificationIndex]) return;
    
    // Update the queue with current marked as handled
    const updatedQueue = [...notificationQueue];
    updatedQueue[currentNotificationIndex].isHandled = true;
    setNotificationQueue(updatedQueue);
    
    // Find remaining unhandled notifications
    const remainingUnhandled = updatedQueue.filter((n, i) => i !== currentNotificationIndex && !n.isHandled);
    
    if (remainingUnhandled.length === 0) {
      // No more unhandled notifications - close the panel
      console.log('All notifications handled, closing panel');
      setIsNotificationVisible(false);
      
      // Clean up after animation
      setTimeout(() => {
        setNotificationQueue([]);
        setCurrentNotificationIndex(0);
      }, 300);
    } else {
      // Find the next unhandled notification
      const nextUnhandledIndex = updatedQueue.findIndex((n, i) => i > currentNotificationIndex && !n.isHandled);
      
      if (nextUnhandledIndex !== -1) {
        // Navigate to next unhandled
        setCurrentNotificationIndex(nextUnhandledIndex);
      } else {
        // Look for previous unhandled
        const previousUnhandledIndex = updatedQueue.findIndex((n, i) => i < currentNotificationIndex && !n.isHandled);
        if (previousUnhandledIndex !== -1) {
          setCurrentNotificationIndex(previousUnhandledIndex);
        }
      }
    }
  };

  // Attempt navigation - returns false if blocked
  const attemptNavigation = (destination: string): boolean => {
    if (isNavigationBlocked) {
      setAttemptedNavigation(destination);
      
      // Show warning alert
      const unhandledCount = getUnhandledCount();
      alert(
        `⚠️ NAVIGATION BLOCKED\n\n` +
        `You have ${unhandledCount} unhandled payment notification${unhandledCount > 1 ? 's' : ''}.\n\n` +
        `Please complete or explicitly dismiss all notifications before navigating to another page.\n\n` +
        `This is a safety measure to prevent lost payments.`
      );
      
      return false; // Block navigation
    }
    
    return true; // Allow navigation
  };

  // Clear attempted navigation
  const clearAttemptedNavigation = () => {
    setAttemptedNavigation(null);
  };

  // Get unhandled count
  const getUnhandledCount = () => {
    return notificationQueue.filter(n => !n.isHandled).length;
  };

  const value: NotificationContextType = {
    notificationQueue,
    currentNotificationIndex,
    isNotificationVisible,
    hasUnhandledNotifications,
    isNavigationBlocked,
    attemptedNavigation,
    addNotification,
    dismissCurrentNotification,
    navigateToNext,
    navigateToPrevious,
    markCurrentAsHandled,
    attemptNavigation,
    clearAttemptedNavigation,
    getUnhandledCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};