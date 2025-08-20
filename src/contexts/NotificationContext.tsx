// src/contexts/NotificationContext.tsx - Enhanced with persistence and cross-session sync
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Types (keeping existing interfaces)
interface Transaction {
  id: string;
  transaction_type: 'purchase' | 'sale';
  supplier_id?: string | null;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  created_at: string;
  // ... other fields as before
}

interface TransactionPhoto {
  id: string;
  transaction_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  upload_order?: number | null;
  storage_bucket?: string | null;
  is_primary?: boolean | null;
  notes?: string | null;
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
  updated_at: string;
}

// Enhanced notification data with persistence info
export interface NotificationData {
  id: string; // This will be the notification_states.id from database
  transaction: Transaction;
  suppliers: Supplier[];
  photos: TransactionPhoto[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  isHandled: boolean;
  isDismissed: boolean;
  timestamp: string;
  priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  requiresAction: boolean;
  handledBy?: string;
  handledAt?: string;
  expiresAt?: string;
}

// Database row interface for notification_states
interface NotificationStateRow {
  id: string;
  transaction_id: string;
  transaction_table: string;
  event_type: string;
  notification_data: any;
  is_handled: boolean;
  is_dismissed: boolean;
  handled_at?: string;
  handled_by?: string;
  handled_session?: string;
  priority_level: string;
  requires_action: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

interface SessionInfo {
  sessionId: string;
  userIdentifier: string;
  deviceInfo: any;
}

interface NotificationContextType {
  notificationQueue: NotificationData[];
  currentNotificationIndex: number;
  isNotificationVisible: boolean;
  hasUnhandledNotifications: boolean;
  isNavigationBlocked: boolean;
  attemptedNavigation: string | null;
  sessionInfo: SessionInfo | null;
  
  // Actions
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled' | 'isDismissed' | 'photos'>) => Promise<void>;
  dismissCurrentNotification: () => void;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  markCurrentAsHandled: () => Promise<void>;
  attemptNavigation: (destination: string) => boolean;
  clearAttemptedNavigation: () => void;
  getUnhandledCount: () => number;
  
  // New methods for persistence
  refreshNotifications: () => Promise<void>;
  markAsHandledById: (notificationId: string) => Promise<void>;
  dismissById: (notificationId: string) => Promise<void>;
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
  userIdentifier?: string; // Device ID, user ID, or browser fingerprint
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  suppliers,
  userIdentifier = 'default-user'
}) => {
  const [notificationQueue, setNotificationQueue] = useState<NotificationData[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [attemptedNavigation, setAttemptedNavigation] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const hasUnhandledNotifications = notificationQueue.some(n => !n.isHandled && !n.isDismissed);
  const isNavigationBlocked = hasUnhandledNotifications && isNotificationVisible;

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Initialize session
  const initializeSession = useCallback(async () => {
    try {
      const sessionId = generateSessionId();
      const deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
      };

      // Register session in database
      const { data, error } = await supabase
        .from('user_sessions')
        .upsert({
          session_id: sessionId,
          user_identifier: userIdentifier,
          device_info: deviceInfo,
          is_active: true,
          last_seen: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to initialize session:', error);
        // Continue with fallback session info
      }

      const session: SessionInfo = {
        sessionId,
        userIdentifier,
        deviceInfo
      };

      setSessionInfo(session);
      return session;
    } catch (error) {
      console.error('Error initializing session:', error);
      // Return fallback session
      return {
        sessionId: generateSessionId(),
        userIdentifier,
        deviceInfo: { fallback: true }
      };
    }
  }, [userIdentifier, generateSessionId]);

  // Update session heartbeat
  const updateSessionHeartbeat = useCallback(async () => {
    if (!sessionInfo?.sessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          last_seen: new Date().toISOString(),
          is_active: true
        })
        .eq('session_id', sessionInfo.sessionId);
    } catch (error) {
      console.error('Failed to update session heartbeat:', error);
    }
  }, [sessionInfo?.sessionId]);

  // Enhanced photo fetching
  const fetchTransactionPhotos = async (transactionId: string): Promise<TransactionPhoto[]> => {
    console.log(`[NotificationContext] Fetching photos for transaction: ${transactionId}`);
    
    try {
      const { data, error } = await supabase
        .from('transaction_photos')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('upload_order', { ascending: true });

      if (error) {
        console.error('[NotificationContext] Error fetching transaction photos:', error);
        return [];
      }

      console.log(`[NotificationContext] Fetched ${data?.length || 0} photos for transaction ${transactionId}`);
      return data || [];
    } catch (error) {
      console.error('[NotificationContext] Unexpected error fetching transaction photos:', error);
      return [];
    }
  };

  // Load notifications from database
  const loadNotificationsFromDB = async (): Promise<NotificationData[]> => {
    try {
      console.log('[NotificationContext] Loading notifications from database...');
      
      const { data: notificationStates, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_dismissed', false) // Only load non-dismissed notifications
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading notifications from database:', error);
        return [];
      }

      if (!notificationStates?.length) {
        console.log('[NotificationContext] No persisted notifications found');
        return [];
      }

      console.log(`[NotificationContext] Found ${notificationStates.length} persisted notifications`);

      // Transform database rows to NotificationData
      const notifications: NotificationData[] = [];
      
      for (const state of notificationStates) {
        try {
          const notificationData = state.notification_data;
          
          // Fetch photos for this transaction
          const photos = await fetchTransactionPhotos(state.transaction_id);
          
          const notification: NotificationData = {
            id: state.id,
            transaction: notificationData.transaction,
            suppliers: suppliers, // Use current suppliers
            photos: photos,
            eventType: state.event_type as 'INSERT' | 'UPDATE' | 'DELETE',
            isHandled: state.is_handled,
            isDismissed: state.is_dismissed,
            timestamp: state.created_at,
            priorityLevel: state.priority_level as 'HIGH' | 'MEDIUM' | 'LOW',
            requiresAction: state.requires_action,
            handledBy: state.handled_by || undefined,
            handledAt: state.handled_at || undefined,
            expiresAt: state.expires_at || undefined
          };
          
          notifications.push(notification);
        } catch (error) {
          console.error('Error processing notification state:', state.id, error);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error loading notifications from database:', error);
      return [];
    }
  };

  // Save notification to database
  const saveNotificationToDB = async (notification: NotificationData): Promise<string | null> => {
    try {
      console.log('[NotificationContext] Saving notification to database:', notification.transaction.id);
      
      // Calculate expiry (24 hours for most notifications, 1 hour for DELETE events)
      const hoursToExpiry = notification.eventType === 'DELETE' ? 1 : 24;
      const expiresAt = new Date(Date.now() + hoursToExpiry * 60 * 60 * 1000).toISOString();
      
      // Determine correct table name based on transaction type
      const transactionTable = notification.transaction.transaction_type === 'purchase' ? 'transactions' : 'sales_transactions';
      
      const { data, error } = await supabase
        .from('notification_states')
        .insert({
          transaction_id: notification.transaction.id,
          transaction_table: transactionTable,
          event_type: notification.eventType,
          notification_data: {
            transaction: notification.transaction,
            eventType: notification.eventType,
            timestamp: notification.timestamp
          },
          is_handled: notification.isHandled,
          is_dismissed: notification.isDismissed,
          priority_level: notification.priorityLevel,
          requires_action: notification.requiresAction,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving notification to database:', error);
        return null;
      }

      console.log('[NotificationContext] Notification saved to database with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error saving notification to database:', error);
      return null;
    }
  };

  // Update notification in database
  const updateNotificationInDB = async (notificationId: string, updates: Partial<NotificationStateRow>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notification_states')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error updating notification in database:', error);
        return false;
      }

      console.log('[NotificationContext] Notification updated in database:', notificationId);
      return true;
    } catch (error) {
      console.error('Error updating notification in database:', error);
      return false;
    }
  };

  // Refresh notifications from database
  const refreshNotifications = useCallback(async () => {
    try {
      const notifications = await loadNotificationsFromDB();
      setNotificationQueue(notifications);
      
      // Show notifications if there are unhandled ones and none currently visible
      const hasUnhandled = notifications.some(n => !n.isHandled && !n.isDismissed);
      if (hasUnhandled && !isNotificationVisible) {
        setIsNotificationVisible(true);
        setCurrentNotificationIndex(0);
      }
      
      console.log(`[NotificationContext] Refreshed ${notifications.length} notifications from database`);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [isNotificationVisible]);

  // Add notification (enhanced for persistence)
  const addNotification = async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled' | 'isDismissed' | 'photos'>) => {
    console.log('[NotificationContext] addNotification called for transaction:', notification.transaction.id);
    
    // Fetch photos for this transaction
    const photos = await fetchTransactionPhotos(notification.transaction.id);
    
    const newNotification: NotificationData = {
      ...notification,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
      timestamp: new Date().toISOString(),
      isHandled: false,
      isDismissed: false,
      photos,
      priorityLevel: notification.priorityLevel || (notification.eventType === 'INSERT' ? 'HIGH' : 'MEDIUM'),
      requiresAction: notification.requiresAction !== false // Default to true
    };

    // Save to database first
    const dbId = await saveNotificationToDB(newNotification);
    if (dbId) {
      newNotification.id = dbId; // Use actual database ID
    }

    console.log('[NotificationContext] Adding notification to queue:', {
      id: newNotification.id,
      transactionId: newNotification.transaction.id,
      transactionType: newNotification.transaction.transaction_type,
      photoCount: newNotification.photos.length,
      eventType: newNotification.eventType
    });

    setNotificationQueue(prev => [...prev, newNotification]);
    setIsNotificationVisible(true);
    
    if (notificationQueue.length === 0) {
      setCurrentNotificationIndex(0);
    }
  };

  // Mark notification as handled
  const markAsHandledById = async (notificationId: string): Promise<void> => {
    if (!sessionInfo) return;

    const success = await updateNotificationInDB(notificationId, {
      is_handled: true,
      handled_at: new Date().toISOString(),
      handled_by: sessionInfo.userIdentifier,
      handled_session: sessionInfo.sessionId
    });

    if (success) {
      // Update local state
      setNotificationQueue(prev => 
        prev.map(n => n.id === notificationId ? { 
          ...n, 
          isHandled: true, 
          handledAt: new Date().toISOString(),
          handledBy: sessionInfo.userIdentifier
        } : n)
      );
    }
  };

  // Dismiss notification
  const dismissById = async (notificationId: string): Promise<void> => {
    if (!sessionInfo) return;

    const success = await updateNotificationInDB(notificationId, {
      is_dismissed: true,
      handled_at: new Date().toISOString(),
      handled_by: sessionInfo.userIdentifier,
      handled_session: sessionInfo.sessionId
    });

    if (success) {
      // Update local state
      setNotificationQueue(prev => 
        prev.filter(n => n.id !== notificationId)
      );
    }
  };

  // Enhanced mark current as handled
  const markCurrentAsHandled = async () => {
    const currentNotification = notificationQueue[currentNotificationIndex];
    if (!currentNotification) return;
    
    console.log('[NotificationContext] Marking current notification as handled');
    
    await markAsHandledById(currentNotification.id);
    
    const remainingUnhandled = notificationQueue.filter((n, i) => i !== currentNotificationIndex && !n.isHandled && !n.isDismissed);
    
    if (remainingUnhandled.length === 0) {
      console.log('[NotificationContext] All notifications handled, closing panel');
      setIsNotificationVisible(false);
      
      setTimeout(() => {
        setNotificationQueue(prev => prev.filter(n => !n.isHandled && !n.isDismissed));
        setCurrentNotificationIndex(0);
      }, 300);
    } else {
      const nextUnhandledIndex = notificationQueue.findIndex((n, i) => i > currentNotificationIndex && !n.isHandled && !n.isDismissed);
      
      if (nextUnhandledIndex !== -1) {
        setCurrentNotificationIndex(nextUnhandledIndex);
      } else {
        const previousUnhandledIndex = notificationQueue.findIndex((n, i) => i < currentNotificationIndex && !n.isHandled && !n.isDismissed);
        if (previousUnhandledIndex !== -1) {
          setCurrentNotificationIndex(previousUnhandledIndex);
        }
      }
    }
  };

  // Enhanced dismiss current notification
  const dismissCurrentNotification = () => {
    const currentNotification = notificationQueue[currentNotificationIndex];
    if (!currentNotification) return;

    console.log('[NotificationContext] Dismissing current notification');
    
    // Dismiss in database
    dismissById(currentNotification.id);
    
    setIsNotificationVisible(false);
    
    setTimeout(() => {
      const remainingUnhandled = notificationQueue.filter(n => !n.isHandled && !n.isDismissed && n.id !== currentNotification.id);
      if (remainingUnhandled.length === 0) {
        setNotificationQueue([]);
        setCurrentNotificationIndex(0);
      }
    }, 300);
  };

  // Navigation methods (unchanged)
  const navigateToNext = () => {
    if (currentNotificationIndex < notificationQueue.length - 1) {
      console.log('[NotificationContext] Navigating to next notification');
      setCurrentNotificationIndex(currentNotificationIndex + 1);
    }
  };

  const navigateToPrevious = () => {
    if (currentNotificationIndex > 0) {
      console.log('[NotificationContext] Navigating to previous notification');
      setCurrentNotificationIndex(currentNotificationIndex - 1);
    }
  };

  const attemptNavigation = (destination: string): boolean => {
    if (isNavigationBlocked) {
      setAttemptedNavigation(destination);
      
      const unhandledCount = getUnhandledCount();
      alert(
        `⚠️ NAVIGATION BLOCKED\n\n` +
        `You have ${unhandledCount} unhandled transaction notification${unhandledCount > 1 ? 's' : ''}.\n\n` +
        `Please complete or explicitly dismiss all notifications before navigating to another page.\n\n` +
        `This is a safety measure to prevent lost transactions.`
      );
      
      return false;
    }
    
    return true;
  };

  const clearAttemptedNavigation = () => {
    setAttemptedNavigation(null);
  };

  const getUnhandledCount = () => {
    return notificationQueue.filter(n => !n.isHandled && !n.isDismissed).length;
  };

  // Convert transaction types
  const convertPurchaseTransaction = (purchaseData: any): Transaction => {
    return {
      ...purchaseData,
      transaction_type: 'purchase' as const,
      material_type: purchaseData.material_type
    };
  };

  const convertSalesTransaction = (salesData: any): Transaction => {
    return {
      ...salesData,
      transaction_type: 'sale' as const,
      material_type: salesData.material_name,
      material_name: salesData.material_name
    };
  };

  // Enhanced validation functions based on actual database schema
  const isValidPurchaseTransaction = (obj: any): boolean => {
    return obj && 
           typeof obj === 'object' && 
           typeof obj.id === 'string' &&
           typeof obj.material_type === 'string' &&
           typeof obj.transaction_date === 'string' &&
           typeof obj.total_amount === 'number' &&
           typeof obj.created_at === 'string' &&
           typeof obj.created_by === 'string' &&
           (obj.is_walkin === undefined || typeof obj.is_walkin === 'boolean');
  };

  const isValidSalesTransaction = (obj: any): boolean => {
    return obj && 
           typeof obj === 'object' && 
           typeof obj.id === 'string' &&
           typeof obj.transaction_id === 'string' &&
           typeof obj.material_name === 'string' &&
           typeof obj.transaction_date === 'string' &&
           typeof obj.total_amount === 'number' &&
           typeof obj.weight_kg === 'number' &&
           typeof obj.price_per_kg === 'number' &&
           typeof obj.created_at === 'string';
  };

  // Setup real-time subscriptions and initialization
  useEffect(() => {
    const initializeProvider = async () => {
      console.log('[NotificationContext] Initializing notification provider...');
      
      // Initialize session
      const session = await initializeSession();
      
      // Load existing notifications from database
      await refreshNotifications();
      
      setIsInitialized(true);
      console.log('[NotificationContext] Notification provider initialized');
    };

    initializeProvider();
  }, [initializeSession, refreshNotifications]);

  // Setup real-time subscriptions for new transactions
  useEffect(() => {
    if (!isInitialized) return;

    console.log('[NotificationContext] Setting up real-time subscriptions...');
    
    // Purchase transactions subscription
    const purchaseChannel = supabase
      .channel('purchase-transactions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        async (payload) => {
          const transactionData = payload.eventType === 'DELETE' ? payload.old : payload.new;
          const transactionId = transactionData?.id;

          console.log('[NotificationContext] Purchase transaction change received:', {
            eventType: payload.eventType,
            transactionId: transactionId
          });
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            if (!isValidPurchaseTransaction(transactionData)) {
              console.warn('[NotificationContext] Invalid purchase transaction data received:', transactionData);
              return;
            }
            
            const transaction = convertPurchaseTransaction(transactionData);
            console.log('[NotificationContext] Processing purchase transaction:', transaction.id);
            
            // Add notification with photos
            try {
              await addNotification({
                transaction,
                suppliers,
                eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                priorityLevel: payload.eventType === 'INSERT' ? 'HIGH' : 'MEDIUM',
                requiresAction: payload.eventType === 'INSERT'
              });
            } catch (error) {
              console.error('[NotificationContext] Error adding purchase notification:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Purchase subscription status:', status);
      });

    // Sales transactions subscription
    const salesChannel = supabase
      .channel('sales-transactions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_transactions'
        },
        async (payload) => {
          const transactionData = payload.eventType === 'DELETE' ? payload.old : payload.new;
          const transactionId = transactionData?.id;

          console.log('[NotificationContext] Sales transaction change received:', {
            eventType: payload.eventType,
            transactionId: transactionId
          });
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            if (!isValidSalesTransaction(transactionData)) {
              console.warn('[NotificationContext] Invalid sales transaction data received:', transactionData);
              return;
            }
            
            const transaction = convertSalesTransaction(transactionData);
            console.log('[NotificationContext] Processing sales transaction:', transaction.id);
            
            // Add notification with photos
            try {
              await addNotification({
                transaction,
                suppliers,
                eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                priorityLevel: payload.eventType === 'INSERT' ? 'HIGH' : 'MEDIUM',
                requiresAction: payload.eventType === 'INSERT'
              });
            } catch (error) {
              console.error('[NotificationContext] Error adding sales notification:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Sales subscription status:', status);
      });

    // Subscription for notification_states changes (cross-session sync)
    const notificationStatesChannel = supabase
      .channel('notification-states-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_states'
        },
        (payload) => {
          const updatedState = payload.new;
          console.log('[NotificationContext] Notification state updated by another session:', updatedState.id);
          
          // Update local state if the change was made by another session
          if (updatedState.handled_session !== sessionInfo?.sessionId) {
            setNotificationQueue(prev => 
              prev.map(n => n.id === updatedState.id ? {
                ...n,
                isHandled: updatedState.is_handled,
                isDismissed: updatedState.is_dismissed,
                handledAt: updatedState.handled_at || undefined,
                handledBy: updatedState.handled_by || undefined
              } : n).filter(n => !n.isDismissed) // Remove dismissed notifications
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Notification states subscription status:', status);
      });

    return () => {
      console.log('[NotificationContext] Cleaning up subscriptions');
      supabase.removeChannel(purchaseChannel);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(notificationStatesChannel);
    };
  }, [isInitialized, sessionInfo, suppliers, addNotification]);

  // Session heartbeat
  useEffect(() => {
    if (!sessionInfo) return;

    const heartbeatInterval = setInterval(updateSessionHeartbeat, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionInfo, updateSessionHeartbeat]);

 // Fixed cleanup effect - replace the existing useEffect at the end of the file

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (sessionInfo?.sessionId) {
      // Mark session as inactive
      const markInactive = async () => {
        try {
          const { error } = await supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('session_id', sessionInfo.sessionId);
          
          if (error) {
            console.error('Error marking session as inactive:', error);
          } else {
            console.log('[NotificationContext] Session marked as inactive on cleanup');
          }
        } catch (error) {
          console.error('Error marking session as inactive:', error);
        }
      };
      
      markInactive();
    }
  };
}, [sessionInfo?.sessionId]);
  const value: NotificationContextType = {
    notificationQueue,
    currentNotificationIndex,
    isNotificationVisible,
    hasUnhandledNotifications,
    isNavigationBlocked,
    attemptedNavigation,
    sessionInfo,
    addNotification,
    dismissCurrentNotification,
    navigateToNext,
    navigateToPrevious,
    markCurrentAsHandled,
    attemptNavigation,
    clearAttemptedNavigation,
    getUnhandledCount,
    refreshNotifications,
    markAsHandledById,
    dismissById
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};