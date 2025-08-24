// src/contexts/NotificationContext.tsx - Enhanced with persistence fixes and duplicate prevention
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// FIXED: Consistent transaction interface - using uppercase for transaction_type
interface Transaction {
  id: string;
  transaction_type: 'Purchase' | 'Sale';
  supplier_id?: string | null;
  material_type: string;
  transaction_date: string;
  total_amount: number;
  created_at: string;
  // ... other fields as before
  transaction_number?: string | null;
  is_walkin?: boolean;
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
  supplier_name?: string | null;
  // Sales-specific fields
  transaction_id?: string;
  material_id?: number | null;
  material_name?: string;
  price_per_kg?: number | null;
  is_special_price?: boolean;
  original_price?: number | null;
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

// Enhanced notification data with persistence info
export interface NotificationData {
  id: string;
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
  photosFetched: boolean;
  photoRetryCount: number;
  lastPhotoFetch?: string;
}

// NEW: Bell notification interface for header dropdown
interface BellNotification {
  id: string;
  transaction: Transaction;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  summary: string;
  timestamp: string;
  isRead: boolean;
  transactionId: string;
  priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
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
  // Queue notifications (unhandled only) - for the popup modal
  notificationQueue: NotificationData[];
  currentNotificationIndex: number;
  isNotificationVisible: boolean;
  hasUnhandledNotifications: boolean;
  isNavigationBlocked: boolean;
  attemptedNavigation: string | null;
  sessionInfo: SessionInfo | null;
  
  // Bell notifications (for header dropdown - shows unhandled notifications)
  bellNotifications: BellNotification[];
  unreadBellCount: number;
  
  // Actions
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled' | 'isDismissed' | 'photos' | 'photosFetched' | 'photoRetryCount'>) => Promise<void>;
  dismissCurrentNotification: () => void;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  markCurrentAsHandled: () => Promise<void>;
  attemptNavigation: (destination: string) => boolean;
  clearAttemptedNavigation: () => void;
  getUnhandledCount: () => number;
  
  // Enhanced methods for photo management
  refreshNotifications: () => Promise<void>;
  markAsHandledById: (notificationId: string) => Promise<void>;
  dismissById: (notificationId: string) => Promise<void>;
  retryPhotoFetch: (notificationId: string) => Promise<void>;
  refreshPhotosForTransaction: (transactionId: string) => Promise<TransactionPhoto[]>;
  
  // Bell notification methods
  loadBellNotifications: () => Promise<void>;
  openNotificationFromBell: (notificationId: string) => void;
  markBellNotificationAsRead: (notificationId: string) => void;
  markAllBellNotificationsAsRead: () => void;
  clearBellNotifications: () => void;
  
  // Methods for controlling notification visibility
  setCurrentNotificationIndex: (index: number) => void;
  setIsNotificationVisible: (visible: boolean) => void;
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
  userIdentifier?: string;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  suppliers,
  userIdentifier = 'default-user'
}) => {
  // ===== STATE MANAGEMENT =====
  const [notificationQueue, setNotificationQueue] = useState<NotificationData[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [attemptedNavigation, setAttemptedNavigation] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Bell notification state
  const [bellNotifications, setBellNotifications] = useState<BellNotification[]>([]);
  const [readBellNotifications, setReadBellNotifications] = useState<Set<string>>(new Set());

  // Computed values
  const hasUnhandledNotifications = notificationQueue.some(n => !n.isHandled && !n.isDismissed);
  const isNavigationBlocked = hasUnhandledNotifications && isNotificationVisible;
  const unreadBellCount = bellNotifications.filter(n => !readBellNotifications.has(n.id)).length;

  // ===== UTILITY FUNCTIONS =====
  
  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Convert transaction types consistently
  const convertPurchaseTransaction = (purchaseData: any): Transaction => {
    return {
      ...purchaseData,
      transaction_type: 'Purchase' as const,
      material_type: purchaseData.material_type
    };
  };

  const convertSalesTransaction = (salesData: any): Transaction => {
    return {
      ...salesData,
      transaction_type: 'Sale' as const,
      material_type: salesData.material_name,
      material_name: salesData.material_name
    };
  };

  // Enhanced validation functions
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

  // ===== CLEANUP FUNCTIONS =====
  
  // Add cleanup for old dismissed and handled notifications
  const cleanupDismissedNotifications = useCallback(() => {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('dismissed_') || key.startsWith('handled_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const timestamp = new Date(data.dismissedAt || data.handledAt || 0).getTime();
            const ageHours = (now - timestamp) / (1000 * 60 * 60);
            
            // Clean up handled notifications after 2 hours (they should be gone from DB)
            // Clean up dismissed notifications after 24 hours
            const maxAge = key.startsWith('handled_') ? 2 : 24;
            
            if (ageHours > maxAge) {
              localStorage.removeItem(key);
              console.log(`[NotificationContext] Cleaned up old ${key.startsWith('handled_') ? 'handled' : 'dismissed'} notification: ${key}`);
            }
          } catch (error) {
            // Remove corrupted entries
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error during cleanup of dismissed/handled notifications:', error);
    }
  }, []);

  // ===== SESSION MANAGEMENT =====

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

  // ===== PHOTO MANAGEMENT =====

  // Improved photo fetching with configurable delay
  const fetchTransactionPhotos = async (transactionId: string, retryCount = 0): Promise<TransactionPhoto[]> => {
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
    
    console.log(`[NotificationContext] Fetching photos for transaction: ${transactionId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // First, check if transaction exists and get its details for better logging
      const { data: txData } = await supabase
        .from('transactions')
        .select('transaction_number, created_at')
        .eq('id', transactionId)
        .single();

      if (txData) {
        console.log(`[NotificationContext] Transaction details: ${txData.transaction_number}, created: ${txData.created_at}`);
      }

      // Fetch photos with more detailed query
      const { data, error } = await supabase
        .from('transaction_photos')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('upload_order', { ascending: true });

      if (error) {
        console.error('[NotificationContext] Database error fetching transaction photos:', error);
        
        // Retry logic for database errors
        if (retryCount < maxRetries) {
          console.log(`[NotificationContext] Retrying photo fetch for transaction ${transactionId} in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchTransactionPhotos(transactionId, retryCount + 1);
        }
        
        throw error;
      }

      const photos = data || [];
      console.log(`[NotificationContext] Database query returned ${photos.length} photos for transaction ${transactionId}`);
      
      if (photos.length === 0 && retryCount < maxRetries) {
        // Check if this is a very recent transaction (photos might still be uploading)
        const transactionAge = txData ? Date.now() - new Date(txData.created_at).getTime() : 0;
        const isRecentTransaction = transactionAge < 30000; // 30 seconds
        
        if (isRecentTransaction) {
          console.log(`[NotificationContext] Recent transaction (${Math.round(transactionAge / 1000)}s old), retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchTransactionPhotos(transactionId, retryCount + 1);
        }
      }
      
      return photos;
      
    } catch (error) {
      console.error('[NotificationContext] Unexpected error fetching transaction photos:', error);
      
      // Retry on unexpected errors
      if (retryCount < maxRetries) {
        console.log(`[NotificationContext] Retrying photo fetch after unexpected error for transaction ${transactionId} in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchTransactionPhotos(transactionId, retryCount + 1);
      }
      
      return [];
    }
  };

  // Dedicated function to refresh photos for a specific transaction
  const refreshPhotosForTransaction = useCallback(async (transactionId: string): Promise<TransactionPhoto[]> => {
    console.log(`[NotificationContext] Refreshing photos for transaction: ${transactionId}`);
    return await fetchTransactionPhotos(transactionId, 0);
  }, []);

  // Manual retry for photo fetching
  const retryPhotoFetch = async (notificationId: string): Promise<void> => {
    console.log(`[NotificationContext] Manual retry photo fetch for notification: ${notificationId}`);
    
    setNotificationQueue(prev => 
      prev.map(n => {
        if (n.id === notificationId && n.transaction.transaction_type === 'Purchase') {
          console.log(`[NotificationContext] Retrying photo fetch for transaction: ${n.transaction.id}`);
          
          // Trigger photo fetch asynchronously
          fetchTransactionPhotos(n.transaction.id)
            .then(photos => {
              setNotificationQueue(current => 
                current.map(curr => 
                  curr.id === notificationId 
                    ? { 
                        ...curr, 
                        photos: photos as TransactionPhoto[],
                        photosFetched: true, 
                        photoRetryCount: curr.photoRetryCount + 1,
                        lastPhotoFetch: new Date().toISOString()
                      } 
                    : curr
                )
              );
              console.log(`[NotificationContext] Successfully retried photo fetch: ${photos.length} photos found`);
            })
            .catch(error => {
              console.error(`[NotificationContext] Photo retry failed:`, error);
              setNotificationQueue(current => 
                current.map(curr => 
                  curr.id === notificationId 
                    ? { 
                        ...curr, 
                        photoRetryCount: curr.photoRetryCount + 1,
                        lastPhotoFetch: new Date().toISOString()
                      } 
                    : curr
                )
              );
            });
          
          return { 
            ...n, 
            photoRetryCount: n.photoRetryCount + 1,
            lastPhotoFetch: new Date().toISOString()
          };
        }
        return n;
      })
    );
  };

  // ===== DATABASE OPERATIONS =====

  // Save notification to database
  const saveNotificationToDB = async (notification: NotificationData): Promise<string | null> => {
    try {
      console.log('[NotificationContext] Saving notification to database:', notification.transaction.id);
      
      // Calculate expiry (24 hours for most notifications, 1 hour for DELETE events)
      const hoursToExpiry = notification.eventType === 'DELETE' ? 1 : 24;
      const expiresAt = new Date(Date.now() + hoursToExpiry * 60 * 60 * 1000).toISOString();
      
      // Determine correct table name based on transaction type
      const transactionTable = notification.transaction.transaction_type === 'Purchase' ? 'transactions' : 'sales_transactions';
      
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

  // Enhanced loadNotificationsFromDB function with better filtering
  const loadNotificationsFromDB = async (): Promise<NotificationData[]> => {
    try {
      console.log('[NotificationContext] Loading UNHANDLED notifications from database...');
      
      // CRITICAL: Load only notifications that are NOT handled AND NOT dismissed
      const { data: notificationStates, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_handled', false)  // MUST be unhandled
        .eq('is_dismissed', false) // MUST not be dismissed
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading notifications from database:', error);
        return [];
      }

      if (!notificationStates?.length) {
        console.log('[NotificationContext] No unhandled notifications found');
        return [];
      }

      // Additional safety check to filter out any handled notifications
      const unhandledStates = notificationStates.filter(state => {
        if (state.is_handled === true) {
          console.error(`[NotificationContext] CRITICAL: Handled notification ${state.id} was returned from query - filtering out`);
          return false;
        }
        return true;
      });

      console.log(`[NotificationContext] Found ${unhandledStates.length} unhandled notifications (verified)`);

      // Filter out any locally dismissed notifications (belt and suspenders approach)
      const filteredStates = unhandledStates.filter(state => {
        const dismissedKey = `dismissed_${state.id}`;
        const localDismissed = localStorage.getItem(dismissedKey);
        if (localDismissed) {
          console.log(`[NotificationContext] Filtering out locally dismissed notification: ${state.id}`);
          return false;
        }
        // Final check to ensure not handled (triple verification)
        if (state.is_handled === true) {
          console.error(`[NotificationContext] CRITICAL: Handled notification ${state.id} made it through filters - blocking`);
          return false;
        }
        return true;
      });

      console.log(`[NotificationContext] After all filters: ${filteredStates.length} notifications`);

      // Transform database rows to NotificationData
      const notifications: NotificationData[] = [];
      
      for (const state of filteredStates) {
        try {
          const notificationData = state.notification_data;
          
          // Only fetch photos for Purchase transactions
          let photos: TransactionPhoto[] = [];
          let photosFetched = false;
          let photoRetryCount = 0;
          
          if (state.transaction_table === 'transactions') {
            console.log(`[NotificationContext] Fetching photos for purchase transaction ${state.transaction_id}`);
            try {
              photos = await fetchTransactionPhotos(state.transaction_id);
              photosFetched = true;
              console.log(`[NotificationContext] Successfully fetched ${photos.length} photos for transaction ${state.transaction_id}`);
            } catch (error) {
              console.error(`[NotificationContext] Failed to fetch photos for transaction ${state.transaction_id}:`, error);
              photosFetched = false;
              photoRetryCount = 1;
            }
          } else {
            console.log(`[NotificationContext] Skipping photo fetch for sales transaction ${state.transaction_id}`);
            photosFetched = true; // Sales don't have photos, so mark as "fetched"
          }
          
          const notification: NotificationData = {
            id: state.id,
            transaction: notificationData.transaction,
            suppliers: suppliers,
            photos: photos,
            eventType: state.event_type as 'INSERT' | 'UPDATE' | 'DELETE',
            isHandled: state.is_handled,
            isDismissed: state.is_dismissed,
            timestamp: state.created_at,
            priorityLevel: state.priority_level as 'HIGH' | 'MEDIUM' | 'LOW',
            requiresAction: state.requires_action,
            handledBy: state.handled_by || undefined,
            handledAt: state.handled_at || undefined,
            expiresAt: state.expires_at || undefined,
            photosFetched,
            photoRetryCount,
            lastPhotoFetch: new Date().toISOString()
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

  // ===== BELL NOTIFICATION FUNCTIONS =====

  // Load bell notifications (unhandled notifications for dropdown) - ENHANCED to exclude handled
  const loadBellNotifications = useCallback(async () => {
    try {
      console.log('[NotificationContext] Loading bell notifications (unhandled only)...');
      
      const { data: notificationStates, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_handled', false)  // MUST be unhandled
        .eq('is_dismissed', false) // MUST not be dismissed
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bell notifications:', error);
        return;
      }

      // Additional filter to ensure no handled notifications
      const unhandledStates = (notificationStates || []).filter(state => {
        // Check localStorage for handled status
        const handledKey = `handled_${state.id}`;
        if (localStorage.getItem(handledKey)) {
          console.log(`[NotificationContext] Excluding handled notification ${state.id} from bell`);
          return false;
        }
        // Verify not handled
        if (state.is_handled === true) {
          console.error(`[NotificationContext] CRITICAL: Handled notification ${state.id} in bell query - blocking`);
          return false;
        }
        return true;
      });

      const bellNotifs: BellNotification[] = unhandledStates.map(state => {
        const transaction = state.notification_data.transaction;
        const customerName = transaction.transaction_type === 'Purchase'
          ? (transaction.is_walkin 
              ? transaction.walkin_name || 'Walk-in Customer'
              : transaction.supplier_name || 'Unknown Supplier')
          : transaction.supplier_name || 'Unknown Customer';

        const amount = transaction.total_amount || 0;
        const material = transaction.material_type || transaction.material_name || 'Unknown Material';

        let summary = '';
        if (state.event_type === 'INSERT') {
          summary = `New ${transaction.transaction_type.toLowerCase()} from ${customerName} - KES ${amount.toLocaleString()} (${material})`;
        } else if (state.event_type === 'UPDATE') {
          summary = `${transaction.transaction_type} updated - ${customerName} - KES ${amount.toLocaleString()}`;
        } else {
          summary = `${transaction.transaction_type} deleted - ${customerName} - KES ${amount.toLocaleString()}`;
        }

        return {
          id: state.id,
          transaction: transaction,
          eventType: state.event_type as 'INSERT' | 'UPDATE' | 'DELETE',
          summary,
          timestamp: state.created_at,
          isRead: false,
          transactionId: state.transaction_id,
          priorityLevel: state.priority_level as 'HIGH' | 'MEDIUM' | 'LOW'
        };
      });

      setBellNotifications(bellNotifs);
      console.log(`[NotificationContext] Loaded ${bellNotifs.length} bell notifications (all unhandled)`);
    } catch (error) {
      console.error('Error loading bell notifications:', error);
    }
  }, []);

  // Mark bell notification as read
  const markBellNotificationAsRead = useCallback((notificationId: string) => {
    setReadBellNotifications(prev => new Set([...prev, notificationId]));
  }, []);

  // Mark all bell notifications as read
  const markAllBellNotificationsAsRead = useCallback(() => {
    const allIds = bellNotifications.map(n => n.id);
    setReadBellNotifications(new Set(allIds));
  }, [bellNotifications]);

  // Clear bell notifications
  const clearBellNotifications = useCallback(() => {
    setBellNotifications([]);
    setReadBellNotifications(new Set());
  }, []);

  // ===== MAIN NOTIFICATION FUNCTIONS =====

  // Refresh notifications from database - ENHANCED to exclude handled
  const refreshNotifications = useCallback(async () => {
    try {
      console.log('[NotificationContext] Refreshing UNHANDLED notifications only...');
      
      // Load only unhandled notifications
      const notifications = await loadNotificationsFromDB();
      
      // Additional filter to exclude any handled notifications from localStorage
      const filteredNotifications = notifications.filter(n => {
        const handledKey = `handled_${n.id}`;
        const isHandled = localStorage.getItem(handledKey);
        if (isHandled) {
          console.log(`[NotificationContext] Excluding handled notification ${n.id} from refresh`);
          return false;
        }
        // Double-check the notification isn't handled
        if (n.isHandled === true) {
          console.error(`[NotificationContext] CRITICAL: Handled notification ${n.id} in refresh - blocking`);
          return false;
        }
        return true;
      });
      
      setNotificationQueue(filteredNotifications);
      
      // Reload bell notifications as well
      await loadBellNotifications();
      
      // Show notifications if there are unhandled ones and none currently visible
      const hasUnhandled = filteredNotifications.some(n => !n.isHandled && !n.isDismissed);
      if (hasUnhandled && !isNotificationVisible) {
        setIsNotificationVisible(true);
        setCurrentNotificationIndex(0);
      }
      
      console.log(`[NotificationContext] Refreshed ${filteredNotifications.length} unhandled notifications (${notifications.length} before filter)`);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [isNotificationVisible, loadBellNotifications]);

  // Open notification from bell dropdown
  const openNotificationFromBell = useCallback((notificationId: string) => {
    console.log('[NotificationContext] Opening notification from bell:', notificationId);
    
    // Find the notification in the queue
    const notificationIndex = notificationQueue.findIndex(n => n.id === notificationId);
    
    if (notificationIndex !== -1) {
      // Set current notification and show modal
      setCurrentNotificationIndex(notificationIndex);
      setIsNotificationVisible(true);
      
      // Mark as read in bell
      setReadBellNotifications(prev => new Set([...prev, notificationId]));
    } else {
      console.warn('Notification not found in queue:', notificationId);
      // Refresh notifications and try again
      refreshNotifications().then(() => {
        const updatedIndex = notificationQueue.findIndex(n => n.id === notificationId);
        if (updatedIndex !== -1) {
          setCurrentNotificationIndex(updatedIndex);
          setIsNotificationVisible(true);
          setReadBellNotifications(prev => new Set([...prev, notificationId]));
        }
      });
    }
  }, [notificationQueue, refreshNotifications]);

  // Mark notification as handled - ENHANCED with verification
  const markAsHandledById = async (notificationId: string): Promise<void> => {
    if (!sessionInfo) {
      console.warn('[NotificationContext] No session info available for marking notification as handled');
      return;
    }

    console.log(`[NotificationContext] Marking notification ${notificationId} as HANDLED (permanent)`);

    try {
      // Update in database with explicit handled status
      const { error } = await supabase
        .from('notification_states')
        .update({
          is_handled: true,  // CRITICAL: Mark as handled
          is_dismissed: false, // Ensure it's not confused with dismissed
          handled_at: new Date().toISOString(),
          handled_by: sessionInfo.userIdentifier,
          handled_session: sessionInfo.sessionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as handled:', error);
        throw error;
      }

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('notification_states')
        .select('is_handled')
        .eq('id', notificationId)
        .single();

      if (verifyError || !verifyData?.is_handled) {
        console.error('Failed to verify notification was marked as handled');
        throw new Error('Verification failed');
      }

      console.log(`[NotificationContext] Successfully marked notification ${notificationId} as HANDLED (verified)`);

      // Remove from local state immediately
      setNotificationQueue(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      // Also remove from bell notifications since it's handled
      setBellNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );

      // Add to a permanent handled list in localStorage to prevent any recovery
      const handledKey = `handled_${notificationId}`;
      localStorage.setItem(handledKey, JSON.stringify({
        notificationId,
        handledAt: new Date().toISOString(),
        sessionId: sessionInfo.sessionId,
        permanent: true
      }));

      // Clean up any dismissed key if it exists
      const dismissedKey = `dismissed_${notificationId}`;
      localStorage.removeItem(dismissedKey);

    } catch (error) {
      console.error('Failed to mark notification as handled:', error);
      alert('Failed to mark notification as complete. Please try again.');
    }
  };

  // Enhanced dismissById function
  const dismissById = async (notificationId: string): Promise<void> => {
    if (!sessionInfo) {
      console.warn('No session info available for dismissing notification');
      return;
    }

    console.log('[NotificationContext] Dismissing notification:', notificationId);

    try {
      // First update the database
      const { error } = await supabase
        .from('notification_states')
        .update({
          is_dismissed: true,
          is_handled: false, // Make sure we distinguish between dismissed and handled
          handled_at: new Date().toISOString(),
          handled_by: sessionInfo.userIdentifier,
          handled_session: sessionInfo.sessionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Database error dismissing notification:', error);
        throw error;
      }

      console.log('[NotificationContext] Successfully dismissed notification in database:', notificationId);

      // Then update local state - remove from both queues
      setNotificationQueue(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        console.log(`[NotificationContext] Removed from queue: ${prev.length} -> ${filtered.length}`);
        return filtered;
      });
      
      setBellNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        console.log(`[NotificationContext] Removed from bell: ${prev.length} -> ${filtered.length}`);
        return filtered;
      });

      // Also add to a local dismissed cache to prevent re-adding
      const dismissedKey = `dismissed_${notificationId}`;
      localStorage.setItem(dismissedKey, JSON.stringify({
        notificationId,
        dismissedAt: new Date().toISOString(),
        sessionId: sessionInfo.sessionId
      }));

    } catch (error) {
      console.error('Error dismissing notification:', error);
      // Show user-friendly error
      alert('Failed to dismiss notification. Please try again.');
    }
  };

  // Add notification with photo fetching and duplicate prevention
  const addNotification = async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled' | 'isDismissed' | 'photos' | 'photosFetched' | 'photoRetryCount'>) => {
    console.log('[NotificationContext] addNotification called for transaction:', notification.transaction.id, 'type:', notification.transaction.transaction_type);
    
    // Check for existing notification to prevent duplicates
    const existingNotification = notificationQueue.find(n => 
      n.transaction.id === notification.transaction.id && 
      n.eventType === notification.eventType
    );

    if (existingNotification) {
      console.log(`[NotificationContext] Duplicate notification prevented for transaction: ${notification.transaction.id}`);
      return;
    }

    // Check if this notification was recently dismissed
    const dismissedKey = `dismissed_${notification.transaction.id}`;
    const localDismissed = localStorage.getItem(dismissedKey);
    if (localDismissed) {
      console.log(`[NotificationContext] Skipping dismissed notification for transaction: ${notification.transaction.id}`);
      return;
    }
    
    let photos: TransactionPhoto[] = [];
    let photosFetched = false;
    let photoRetryCount = 0;
    
    // Only fetch photos for Purchase transactions
    if (notification.transaction.transaction_type === 'Purchase') {
      console.log(`[NotificationContext] Fetching photos for purchase transaction ${notification.transaction.id}`);
      try {
        photos = await fetchTransactionPhotos(notification.transaction.id);
        photosFetched = true;
        console.log(`[NotificationContext] Fetched ${photos.length} photos for purchase transaction`);
      } catch (error) {
        console.error(`[NotificationContext] Failed to fetch photos for transaction ${notification.transaction.id}:`, error);
        photosFetched = false;
        photoRetryCount = 1;
      }
    } else {
      console.log(`[NotificationContext] Skipping photo fetch for sales transaction ${notification.transaction.id}`);
      photosFetched = true; // Sales don't have photos
    }
    
    const newNotification: NotificationData = {
      ...notification,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      isHandled: false,
      isDismissed: false,
      photos,
      photosFetched,
      photoRetryCount,
      lastPhotoFetch: new Date().toISOString(),
      priorityLevel: notification.priorityLevel || (notification.eventType === 'INSERT' ? 'HIGH' : 'MEDIUM'),
      requiresAction: notification.requiresAction !== false
    };

    // Save to database first
    const dbId = await saveNotificationToDB(newNotification);
    if (dbId) {
      newNotification.id = dbId;
    }

    console.log('[NotificationContext] Adding notification to queue:', {
      id: newNotification.id,
      transactionId: newNotification.transaction.id,
      transactionType: newNotification.transaction.transaction_type,
      photoCount: newNotification.photos.length,
      photosFetched: newNotification.photosFetched,
      eventType: newNotification.eventType
    });

    setNotificationQueue(prev => [...prev, newNotification]);
    setIsNotificationVisible(true);
    
    if (notificationQueue.length === 0) {
      setCurrentNotificationIndex(0);
    }

    // Also refresh bell notifications
    await loadBellNotifications();
  };

  // ===== NAVIGATION AND CONTROL FUNCTIONS =====

  // Enhanced mark current as handled - FIXED to ensure permanent handling
  const markCurrentAsHandled = async () => {
    const currentNotification = notificationQueue[currentNotificationIndex];
    if (!currentNotification) return;
    
    console.log('[NotificationContext] Marking current notification as PERMANENTLY handled');
    
    // Use the enhanced markAsHandledById which now permanently handles notifications
    await markAsHandledById(currentNotification.id);
    
    // Get remaining unhandled notifications
    const remainingUnhandled = notificationQueue.filter((n, i) => {
      if (i === currentNotificationIndex) return false; // Exclude current
      if (n.isHandled) return false; // Exclude already handled
      if (n.isDismissed) return false; // Exclude dismissed
      // Check localStorage for handled status
      const handledKey = `handled_${n.id}`;
      if (localStorage.getItem(handledKey)) return false; // Exclude if marked as handled in localStorage
      return true;
    });
    
    if (remainingUnhandled.length === 0) {
      console.log('[NotificationContext] All notifications handled, closing panel');
      setIsNotificationVisible(false);
      
      setTimeout(() => {
        // Clean up the queue, removing handled notifications
        setNotificationQueue(prev => prev.filter(n => {
          if (n.isHandled || n.isDismissed) return false;
          const handledKey = `handled_${n.id}`;
          if (localStorage.getItem(handledKey)) return false;
          return true;
        }));
        setCurrentNotificationIndex(0);
      }, 300);
    } else {
      // Find next unhandled notification
      const nextUnhandledIndex = notificationQueue.findIndex((n, i) => {
        if (i <= currentNotificationIndex) return false; // Skip current and previous
        if (n.isHandled || n.isDismissed) return false;
        const handledKey = `handled_${n.id}`;
        if (localStorage.getItem(handledKey)) return false;
        return true;
      });
      
      if (nextUnhandledIndex !== -1) {
        setCurrentNotificationIndex(nextUnhandledIndex);
      } else {
        // Look for previous unhandled
        const previousUnhandledIndex = notificationQueue.findIndex((n, i) => {
          if (i >= currentNotificationIndex) return false;
          if (n.isHandled || n.isDismissed) return false;
          const handledKey = `handled_${n.id}`;
          if (localStorage.getItem(handledKey)) return false;
          return true;
        });
        
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

    console.log('[NotificationContext] Dismissing current notification:', currentNotification.id);
    
    // Dismiss in database first, then update UI
    dismissById(currentNotification.id).then(() => {
      setIsNotificationVisible(false);
      
      // Wait for animation, then clean up local state
      setTimeout(() => {
        const remainingUnhandled = notificationQueue.filter(
          (n, i) => i !== currentNotificationIndex && !n.isHandled && !n.isDismissed && n.id !== currentNotification.id
        );
        
        if (remainingUnhandled.length === 0) {
          console.log('[NotificationContext] No remaining notifications after dismiss');
          setNotificationQueue([]);
          setCurrentNotificationIndex(0);
        } else {
          // Navigate to next available notification
          const nextIndex = notificationQueue.findIndex(
            (n, i) => i > currentNotificationIndex && !n.isHandled && !n.isDismissed && n.id !== currentNotification.id
          );
          
          if (nextIndex !== -1) {
            setCurrentNotificationIndex(nextIndex);
            setIsNotificationVisible(true); // Keep showing notifications
          } else {
            // Check for previous notifications
            const prevIndex = notificationQueue.findIndex(
              (n, i) => i < currentNotificationIndex && !n.isHandled && !n.isDismissed && n.id !== currentNotification.id
            );
            
            if (prevIndex !== -1) {
              setCurrentNotificationIndex(prevIndex);
              setIsNotificationVisible(true);
            } else {
              // No more notifications
              setIsNotificationVisible(false);
              setNotificationQueue([]);
              setCurrentNotificationIndex(0);
            }
          }
        }
      }, 300);
    }).catch(error => {
      console.error('Failed to dismiss notification:', error);
      // Don't hide the notification if dismiss failed
    });
  };

  // Navigation methods
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

  // ===== EFFECTS AND SUBSCRIPTIONS =====

  // Cleanup initialization effect - ENHANCED for handled notifications
  useEffect(() => {
    // Clean up old dismissed and handled notifications on startup
    cleanupDismissedNotifications();
    
    // Set up periodic cleanup every 30 minutes (more aggressive for handled)
    const cleanupInterval = setInterval(cleanupDismissedNotifications, 30 * 60 * 1000);
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [cleanupDismissedNotifications]);

  // Setup real-time subscriptions and initialization
  useEffect(() => {
    const initializeProvider = async () => {
      console.log('[NotificationContext] Initializing notification provider...');
      
      const session = await initializeSession();
      await refreshNotifications();
      
      setIsInitialized(true);
      console.log('[NotificationContext] Notification provider initialized');
    };

    initializeProvider();
  }, [initializeSession, refreshNotifications]);

  // Real-time subscriptions with enhanced duplicate prevention
  useEffect(() => {
    if (!isInitialized) return;

    console.log('[NotificationContext] Setting up real-time subscriptions...');
    
    // Purchase transactions subscription with duplicate prevention
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

          // Check if we already have a notification for this transaction
          const existingNotification = notificationQueue.find(n => 
            n.transaction.id === transactionId && 
            n.eventType === payload.eventType
          );

          if (existingNotification) {
            console.log(`[NotificationContext] Duplicate notification prevented for transaction: ${transactionId}`);
            return;
          }

          // Check if this notification was recently dismissed
          const recentlyDismissedKey = Object.keys(localStorage).find(key => 
            key.startsWith('dismissed_') && 
            localStorage.getItem(key)?.includes(transactionId)
          );

          if (recentlyDismissedKey) {
            console.log(`[NotificationContext] Skipping dismissed notification for transaction: ${transactionId}`);
            return;
          }
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            if (!isValidPurchaseTransaction(transactionData)) {
              console.warn('[NotificationContext] Invalid purchase transaction data received:', transactionData);
              return;
            }
            
            const transaction = convertPurchaseTransaction(transactionData);
            console.log('[NotificationContext] Processing purchase transaction:', transaction.id);
            
            if (payload.eventType === 'INSERT') {
              console.log('[NotificationContext] Waiting 3 seconds for photos to be uploaded...');
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
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

    // Sales transactions subscription with duplicate prevention
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

          // Check if we already have a notification for this transaction
          const existingNotification = notificationQueue.find(n => 
            n.transaction.id === transactionId && 
            n.eventType === payload.eventType
          );

          if (existingNotification) {
            console.log(`[NotificationContext] Duplicate notification prevented for transaction: ${transactionId}`);
            return;
          }

          // Check if this notification was recently dismissed
          const recentlyDismissedKey = Object.keys(localStorage).find(key => 
            key.startsWith('dismissed_') && 
            localStorage.getItem(key)?.includes(transactionId)
          );

          if (recentlyDismissedKey) {
            console.log(`[NotificationContext] Skipping dismissed notification for transaction: ${transactionId}`);
            return;
          }
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            if (!isValidSalesTransaction(transactionData)) {
              console.warn('[NotificationContext] Invalid sales transaction data received:', transactionData);
              return;
            }
            
            const transaction = convertSalesTransaction(transactionData);
            console.log('[NotificationContext] Processing sales transaction:', transaction.id);
            
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

    // Photo uploads subscription
    const photoChannel = supabase
      .channel('photo-uploads-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transaction_photos'
        },
        async (payload) => {
          const rawPhotoData = payload.new;
          console.log('[NotificationContext] New photo uploaded:', rawPhotoData.transaction_id, rawPhotoData.file_name);
          
          if (!rawPhotoData || typeof rawPhotoData !== 'object') {
            console.warn('[NotificationContext] Invalid photo data received:', rawPhotoData);
            return;
          }

          const photoData: TransactionPhoto = {
            id: rawPhotoData.id,
            transaction_id: rawPhotoData.transaction_id,
            file_name: rawPhotoData.file_name || '',
            file_path: rawPhotoData.file_path || '',
            file_size_bytes: rawPhotoData.file_size_bytes || null,
            mime_type: rawPhotoData.mime_type || null,
            upload_order: rawPhotoData.upload_order || null,
            storage_bucket: rawPhotoData.storage_bucket || 'transaction-photos',
            is_primary: rawPhotoData.is_primary || null,
            notes: rawPhotoData.notes || null,
            created_at: rawPhotoData.created_at || new Date().toISOString(),
            updated_at: rawPhotoData.updated_at || null
          };

          if (!photoData.id || !photoData.transaction_id || !photoData.file_path) {
            console.warn('[NotificationContext] Photo data missing required fields:', photoData);
            return;
          }
          
          setNotificationQueue(prev => 
            prev.map(notification => {
              if (notification.transaction.id === photoData.transaction_id && 
                  notification.transaction.transaction_type === 'Purchase') {
                console.log(`[NotificationContext] Updating notification with new photo for transaction: ${photoData.transaction_id}`);
                
                const photoExists = notification.photos.some(existingPhoto => existingPhoto.id === photoData.id);
                if (photoExists) {
                  console.log(`[NotificationContext] Photo ${photoData.id} already exists, skipping duplicate`);
                  return notification;
                }
                
                const updatedPhotos: TransactionPhoto[] = [...notification.photos, photoData];
                
                return {
                  ...notification,
                  photos: updatedPhotos,
                  photosFetched: true,
                  lastPhotoFetch: new Date().toISOString()
                };
              }
              return notification;
            })
          );
        }
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Photo subscription status:', status);
      });

    // Notification states subscription
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
          
          if (updatedState.handled_session !== sessionInfo?.sessionId) {
            setNotificationQueue(prev => 
              prev.map(n => n.id === updatedState.id ? {
                ...n,
                isHandled: updatedState.is_handled,
                isDismissed: updatedState.is_dismissed,
                handledAt: updatedState.handled_at || undefined,
                handledBy: updatedState.handled_by || undefined
              } : n).filter(n => !n.isDismissed)
            );
            
            if (updatedState.is_handled || updatedState.is_dismissed) {
              setBellNotifications(prev => 
                prev.filter(n => n.id !== updatedState.id)
              );
            }
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
      supabase.removeChannel(photoChannel);
      supabase.removeChannel(notificationStatesChannel);
    };
  }, [isInitialized, sessionInfo, suppliers, addNotification, notificationQueue]);

  // Session heartbeat
  useEffect(() => {
    if (!sessionInfo) return;

    const heartbeatInterval = setInterval(updateSessionHeartbeat, 30000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionInfo, updateSessionHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionInfo?.sessionId) {
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

  // ===== CONTEXT VALUE =====
  
  const value: NotificationContextType = {
    notificationQueue,
    currentNotificationIndex,
    isNotificationVisible,
    hasUnhandledNotifications,
    isNavigationBlocked,
    attemptedNavigation,
    sessionInfo,
    
    // Bell notifications
    bellNotifications,
    unreadBellCount,
    
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
    dismissById,
    retryPhotoFetch,
    refreshPhotosForTransaction,
    
    // Bell notification methods
    loadBellNotifications,
    openNotificationFromBell,
    markBellNotificationAsRead,
    markAllBellNotificationsAsRead,
    clearBellNotifications,
    
    // Methods for controlling notification visibility
    setCurrentNotificationIndex,
    setIsNotificationVisible
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};