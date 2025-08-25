// src/contexts/NotificationContext.tsx - Fixed real-time modal display with notification sounds
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
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
  crossSessionAlert: string | null;
  
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

// CRITICAL: Helper function to check if notification is handled
const isNotificationReallyHandled = (notificationId: string): boolean => {
  // Check multiple possible keys
  const keys = [
    `handled_${notificationId}`,
    `dismissed_${notificationId}`,
    notificationId // Just the ID itself
  ];
  
  for (const key of keys) {
    if (localStorage.getItem(`handled_${key}`) !== null || 
        localStorage.getItem(`dismissed_${key}`) !== null) {
      return true;
    }
  }
  
  return false;
};

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
  const [crossSessionAlert, setCrossSessionAlert] = useState<string | null>(null);

  // Bell notification state
  const [bellNotifications, setBellNotifications] = useState<BellNotification[]>([]);
  const [readBellNotifications, setReadBellNotifications] = useState<Set<string>>(new Set());
  
  // Refs for stable references in subscriptions
  const notificationQueueRef = useRef<NotificationData[]>([]);
  const processingNotificationsRef = useRef<Set<string>>(new Set());
  const subscriptionRef = useRef<any>(null);
  const isNotificationVisibleRef = useRef<boolean>(false);
  const pendingModalShowRef = useRef<boolean>(false); // NEW: Track pending modal show

  // Keep refs in sync with state
  useEffect(() => {
    notificationQueueRef.current = notificationQueue;
  }, [notificationQueue]);

  useEffect(() => {
    isNotificationVisibleRef.current = isNotificationVisible;
  }, [isNotificationVisible]);

  const hasUnhandledNotifications = notificationQueue.some(n => !n.isHandled && !n.isDismissed);
  const isNavigationBlocked = hasUnhandledNotifications && isNotificationVisible;
  const unreadBellCount = bellNotifications.filter(n => !readBellNotifications.has(n.id)).length;

  // ===== SOUND PLAYBACK UTILITIES =====
  
  // Function to play notification sound based on transaction type
  const playNotificationSound = useCallback((transactionType: 'Purchase' | 'Sale') => {
    try {
      // Use notification-one.mp3 for Purchase, notification-two.mp3 for Sale
      const soundFile = transactionType === 'Purchase' 
        ? '/notification-one.mp3' 
        : '/notification-two.mp3';
      
      const audio = new Audio(soundFile);
      audio.volume = 0.6; // Set volume to 60% to not be too loud
      
      // Play the sound
      audio.play().catch(error => {
        console.warn(`[NotificationContext] Could not play notification sound:`, error);
        // Don't throw error if sound fails - notification should still work
      });
      
      console.log(`[NotificationContext] Playing ${transactionType} notification sound: ${soundFile}`);
    } catch (error) {
      console.warn('[NotificationContext] Error setting up notification sound:', error);
      // Fail silently - sound is not critical
    }
  }, []);

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
           typeof obj.material_name === 'string' &&
           typeof obj.transaction_date === 'string' &&
           typeof obj.total_amount === 'number' &&
           typeof obj.weight_kg === 'number' &&
           typeof obj.price_per_kg === 'number' &&
           typeof obj.created_at === 'string' &&
           (obj.transaction_id == null || typeof obj.transaction_id === 'string');
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
            
            // Clean up handled notifications after 168 hours (7 days), dismissed after 24 hours
            const maxAge = key.startsWith('handled_') ? 168 : 24;
            
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

  // CRITICAL FIX: Enhanced loadNotificationsFromDB function with STRICT filtering
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

      // TRIPLE-CHECK: Filter out ANY handled/dismissed notifications
      const unhandledStates = notificationStates.filter(state => {
        // Check database flags
        if (state.is_handled === true || state.is_dismissed === true) {
          console.warn(`[NotificationContext] CRITICAL: Filtering out handled/dismissed notification ${state.id}`);
          return false;
        }
        
        // Check localStorage (belt and suspenders)
        if (isNotificationReallyHandled(state.id)) {
          console.log(`[NotificationContext] Filtering out locally handled/dismissed notification: ${state.id}`);
          return false;
        }
        
        return true;
      });

      console.log(`[NotificationContext] Found ${unhandledStates.length} truly unhandled notifications (from ${notificationStates.length} total)`);
      
      // If we have unhandled notifications, ensure they will be displayed
      if (unhandledStates.length > 0) {
        console.log(`[NotificationContext] Will process ${unhandledStates.length} unhandled notifications for display`);
      }

      // Transform database rows to NotificationData
      const notifications: NotificationData[] = [];
      
      for (const state of unhandledStates) {
        try {
          const notificationData = state.notification_data;
          
          // Only fetch photos for Purchase transactions
          let photos: TransactionPhoto[] = [];
          let photosFetched = false;
          let photoRetryCount = 0;
          
          // CRITICAL: Check transaction table to determine type
          const isPurchase = state.transaction_table === 'transactions';
          const isSale = state.transaction_table === 'sales_transactions';
          
          if (isPurchase) {
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
          } else if (isSale) {
            console.log(`[NotificationContext] Skipping photo fetch for sales transaction ${state.transaction_id}`);
            photosFetched = true; // Sales don't have photos, so mark as "fetched"
          } else {
            console.warn(`[NotificationContext] Unknown transaction table: ${state.transaction_table}`);
            photosFetched = true; // Default to true to avoid blocking
          }
          
          const notification: NotificationData = {
            id: state.id,
            transaction: notificationData.transaction,
            suppliers: suppliers,
            photos: photos,
            eventType: state.event_type as 'INSERT' | 'UPDATE' | 'DELETE',
            isHandled: false, // ALWAYS false since we filtered
            isDismissed: false, // ALWAYS false since we filtered
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

  // ===== CRITICAL FIX: Force modal display for any unhandled notifications =====
  useEffect(() => {
    // Check for unhandled notifications
    const unhandledNotifications = notificationQueue.filter(n => !n.isHandled && !n.isDismissed);
    
    if (unhandledNotifications.length > 0 && !isNotificationVisible) {
      console.log(`[NotificationContext] 🚨 FORCE SHOWING MODAL for ${unhandledNotifications.length} unhandled notifications`);
      
      // Find the first unhandled notification index
      const firstUnhandledIndex = notificationQueue.findIndex(n => !n.isHandled && !n.isDismissed);
      
      if (firstUnhandledIndex !== -1) {
        // Immediately show modal
        setCurrentNotificationIndex(firstUnhandledIndex);
        setIsNotificationVisible(true);
        console.log(`[NotificationContext] ✅ Modal forced visible at index ${firstUnhandledIndex}`);
        
        // Play sound for the notification
        const notification = notificationQueue[firstUnhandledIndex];
        if (notification && notification.transaction) {
          playNotificationSound(notification.transaction.transaction_type);
        }
      }
    }
  }, [notificationQueue, isNotificationVisible, playNotificationSound]); // React to ANY change in queue or visibility

  // Periodic visibility check for notifications
  useEffect(() => {
    if (!isInitialized) return;
    
    const visibilityCheck = setInterval(() => {
      const unhandled = notificationQueue.filter(n => !n.isHandled && !n.isDismissed);
      if (unhandled.length > 0 && !isNotificationVisible) {
        console.log(`[NotificationContext] Periodic check: ${unhandled.length} unhandled notifications need display`);
        const firstUnhandledIndex = notificationQueue.findIndex(n => !n.isHandled && !n.isDismissed);
        if (firstUnhandledIndex !== -1) {
          setCurrentNotificationIndex(firstUnhandledIndex);
          setIsNotificationVisible(true);
          
          // Play sound for the notification
          const notification = notificationQueue[firstUnhandledIndex];
          if (notification && notification.transaction) {
            playNotificationSound(notification.transaction.transaction_type);
          }
        }
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(visibilityCheck);
  }, [isInitialized, notificationQueue, isNotificationVisible, playNotificationSound]);

  // ===== BELL NOTIFICATION FUNCTIONS =====

  // CRITICAL FIX: Load bell notifications with STRICT filtering
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

      // TRIPLE-CHECK filtering
      const unhandledStates = (notificationStates || []).filter(state => {
        // Check database
        if (state.is_handled === true || state.is_dismissed === true) {
          console.warn(`[NotificationContext] Filtering out handled/dismissed from bell: ${state.id}`);
          return false;
        }
        
        // Check localStorage
        if (isNotificationReallyHandled(state.id)) {
          console.log(`[NotificationContext] Excluding handled notification ${state.id} from bell`);
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
      console.log(`[NotificationContext] Loaded ${bellNotifs.length} bell notifications (all verified unhandled)`);
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

  // CRITICAL FIX: Refresh notifications with STRICT filtering
  const refreshNotifications = useCallback(async () => {
    try {
      console.log('[NotificationContext] Refreshing UNHANDLED notifications only...');
      
      // Load only unhandled notifications
      const notifications = await loadNotificationsFromDB();
      
      // TRIPLE-CHECK filtering
      const filteredNotifications = notifications.filter(n => {
        if (isNotificationReallyHandled(n.id)) {
          console.log(`[NotificationContext] Excluding handled notification ${n.id} from refresh`);
          return false;
        }
        if (n.isHandled === true || n.isDismissed === true) {
          console.error(`[NotificationContext] CRITICAL: Handled/dismissed notification ${n.id} in refresh - blocking`);
          return false;
        }
        return true;
      });
      
      setNotificationQueue(filteredNotifications);
      
      // CRITICAL: If we have unhandled notifications, force show modal immediately
      if (filteredNotifications.length > 0 && !isNotificationVisible) {
        console.log(`[NotificationContext] Force showing modal for ${filteredNotifications.length} unhandled notifications from refresh`);
        setCurrentNotificationIndex(0);
        setIsNotificationVisible(true);
        
        // Play sound for first notification
        if (filteredNotifications[0] && filteredNotifications[0].transaction) {
          playNotificationSound(filteredNotifications[0].transaction.transaction_type);
        }
      }
      
      // Reload bell notifications as well
      await loadBellNotifications();
      
      console.log(`[NotificationContext] Refreshed ${filteredNotifications.length} unhandled notifications (${notifications.length} before filter)`);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [loadBellNotifications, isNotificationVisible, playNotificationSound]);

  // Open notification from bell dropdown - ENHANCED with cross-session check and sound
  const openNotificationFromBell = useCallback(async (notificationId: string) => {
    console.log('[NotificationContext] Opening notification from bell:', notificationId);
    
    // First check if this notification is still unhandled in the database
    const { data: dbState, error } = await supabase
      .from('notification_states')
      .select('is_handled, is_dismissed, handled_session')
      .eq('id', notificationId)
      .single();
    
    if (error) {
      console.error('[NotificationContext] Error checking notification state:', error);
    } else if (dbState && (dbState.is_handled || dbState.is_dismissed)) {
      console.log('[NotificationContext] Notification was already handled/dismissed by another session');
      
      // Remove it from local state
      setNotificationQueue(prev => prev.filter(n => n.id !== notificationId));
      setBellNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Show alert to user
      alert('This notification has already been handled on another device.');
      return;
    }
    
    // Find the notification in the queue
    const notificationIndex = notificationQueue.findIndex(n => n.id === notificationId);
    
    if (notificationIndex !== -1) {
      // Set current notification and show modal
      setCurrentNotificationIndex(notificationIndex);
      setIsNotificationVisible(true);
      
      // Play sound for the notification
      const notification = notificationQueue[notificationIndex];
      if (notification && notification.transaction) {
        playNotificationSound(notification.transaction.transaction_type);
      }
      
      // Mark as read in bell
      setReadBellNotifications(prev => new Set([...prev, notificationId]));
    } else {
      console.warn('Notification not found in queue:', notificationId);
      // Refresh notifications and try again
      await refreshNotifications();
      const updatedQueue = notificationQueue;
      const updatedIndex = updatedQueue.findIndex(n => n.id === notificationId);
      if (updatedIndex !== -1) {
        setCurrentNotificationIndex(updatedIndex);
        setIsNotificationVisible(true);
        setReadBellNotifications(prev => new Set([...prev, notificationId]));
        
        // Play sound
        const notification = updatedQueue[updatedIndex];
        if (notification && notification.transaction) {
          playNotificationSound(notification.transaction.transaction_type);
        }
      } else {
        alert('This notification is no longer available. It may have been handled on another device.');
      }
    }
  }, [notificationQueue, refreshNotifications, playNotificationSound]);

  // Mark notification as handled - ENHANCED with cross-session verification
  const markAsHandledById = async (notificationId: string): Promise<void> => {
    if (!sessionInfo) {
      console.warn('[NotificationContext] No session info available for marking notification as handled');
      return;
    }

    console.log(`[NotificationContext] Marking notification ${notificationId} as HANDLED (permanent)`);

    try {
      // FIRST: Check if already handled by another session
      const { data: checkData, error: checkError } = await supabase
        .from('notification_states')
        .select('is_handled, is_dismissed, handled_session, handled_by')
        .eq('id', notificationId)
        .single();

      if (checkError) {
        console.error('Error checking notification state before handling:', checkError);
      } else if (checkData && checkData.is_handled) {
        console.log(`[NotificationContext] Notification already handled by ${checkData.handled_by} in session ${checkData.handled_session}`);
        
        // Remove from local state
        setNotificationQueue(prev => prev.filter(n => n.id !== notificationId));
        setBellNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Show alert
        setCrossSessionAlert('This notification was already handled on another device');
        setTimeout(() => setCrossSessionAlert(null), 3000);
        
        return;
      }

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

  // FIXED: Simplified addNotification without embedded modal logic
  const addNotification = async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled' | 'isDismissed' | 'photos' | 'photosFetched' | 'photoRetryCount'>) => {
    const notificationKey = `${notification.transaction.id}-${notification.eventType}`;
    console.log('[NotificationContext] 🚨 addNotification called for:', notificationKey, 'Type:', notification.transaction.transaction_type);
    
    // For sales, don't block on processing flag since they're fast
    if (notification.transaction.transaction_type !== 'Sale') {
      // Check if we're already processing this notification
      if (processingNotificationsRef.current.has(notificationKey)) {
        console.log(`[NotificationContext] Already processing notification: ${notificationKey}`);
        return;
      }
    }
    
    // Mark as processing
    processingNotificationsRef.current.add(notificationKey);
    
    try {
      // Check for existing notification to prevent duplicates
      const existingNotification = notificationQueueRef.current.find(n => 
        n.transaction.id === notification.transaction.id && 
        n.eventType === notification.eventType
      );

      if (existingNotification) {
        console.log(`[NotificationContext] Duplicate notification prevented for: ${notificationKey}`);
        return;
      }

      // CRITICAL: Check if this notification was already handled
      const tempCheckKey = `${notification.transaction.id}-${notification.eventType}`;
      if (isNotificationReallyHandled(tempCheckKey)) {
        console.log(`[NotificationContext] Skipping already handled notification: ${notificationKey}`);
        return;
      }
      
      // Check database for existing notification
      const { data: existingDb, error: checkError } = await supabase
        .from('notification_states')
        .select('*')
        .eq('transaction_id', notification.transaction.id)
        .eq('event_type', notification.eventType)
        .single();
      
      if (!checkError && existingDb) {
        // Now check if the DB notification is handled using its ID
        if (isNotificationReallyHandled(existingDb.id)) {
          console.log(`[NotificationContext] Notification ${existingDb.id} is locally marked as handled/dismissed`);
          return;
        }
        
        if (existingDb.is_handled || existingDb.is_dismissed) {
          console.log(`[NotificationContext] Notification already ${existingDb.is_handled ? 'handled' : 'dismissed'} in database: ${notificationKey}`);
          return;
        }
        
        // CRITICAL FIX: If unhandled notification exists in DB but not in queue, add it to queue
        console.log(`[NotificationContext] Unhandled notification exists in database, adding to queue: ${notificationKey}`);
        
        // Fetch photos if needed (only for purchases)
        let photos: TransactionPhoto[] = [];
        let photosFetched = false;
        let photoRetryCount = 0;
        
        if (notification.transaction.transaction_type === 'Purchase') {
          try {
            photos = await fetchTransactionPhotos(notification.transaction.id);
            photosFetched = true;
            console.log(`[NotificationContext] Fetched ${photos.length} photos for existing purchase`);
          } catch (error) {
            console.error(`[NotificationContext] Failed to fetch photos:`, error);
            photosFetched = false;
            photoRetryCount = 1;
          }
        } else {
          photosFetched = true; // Sales don't have photos
        }
        
        // Create notification from existing DB record
        const existingNotification: NotificationData = {
          id: existingDb.id,
          transaction: notification.transaction,
          suppliers: suppliers,
          photos,
          eventType: notification.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          isHandled: false,
          isDismissed: false,
          timestamp: existingDb.created_at,
          priorityLevel: existingDb.priority_level as 'HIGH' | 'MEDIUM' | 'LOW',
          requiresAction: existingDb.requires_action,
          photosFetched,
          photoRetryCount,
          lastPhotoFetch: new Date().toISOString()
        };
        
        // Add to queue if not already there
        const inQueue = notificationQueueRef.current.find(n => n.id === existingDb.id);
        if (!inQueue) {
          setNotificationQueue(prev => {
            const updated = [...prev, existingNotification];
            console.log(`[NotificationContext] Added existing notification to queue: ${prev.length} -> ${updated.length}`);
            return updated;
          });
          
          // Also refresh bell notifications
          await loadBellNotifications();
          
          // Force show modal immediately for sales
          if (!isNotificationVisibleRef.current) {
            console.log(`[NotificationContext] 🚨 FORCING MODAL for existing ${notification.transaction.transaction_type} notification`);
            setTimeout(() => {
              const currentQueue = notificationQueueRef.current;
              const index = currentQueue.findIndex(n => n.id === existingDb.id);
              if (index !== -1) {
                console.log(`[NotificationContext] 🎯 SHOWING MODAL at index ${index}`);
                setCurrentNotificationIndex(index);
                setIsNotificationVisible(true);
                
                // Play notification sound
                playNotificationSound(notification.transaction.transaction_type);
              }
            }, 100);
          }
        } else {
          console.log(`[NotificationContext] Notification ${existingDb.id} already in queue`);
        }
        
        return; // Exit here since we've handled the existing notification
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
        console.log('[NotificationContext] Notification saved to database with ID:', dbId);
      } else {
        console.warn('[NotificationContext] Failed to save to database, using temporary ID');
      }

      console.log('[NotificationContext] 🚀 Adding notification to queue:', {
        id: newNotification.id,
        transactionId: newNotification.transaction.id,
        transactionType: newNotification.transaction.transaction_type,
        photoCount: newNotification.photos.length,
        eventType: newNotification.eventType
      });

      // FIXED: Simply update the queue - the useEffect above will handle modal display
      setNotificationQueue(prev => {
        const updated = [...prev, newNotification];
        console.log(`[NotificationContext] Queue updated: ${prev.length} -> ${updated.length} notifications`);
        return updated;
      });
      
      // Also refresh bell notifications
      await loadBellNotifications();
      
      // FORCE immediate modal display for new notifications
      if (!isNotificationVisibleRef.current) {
        console.log('[NotificationContext] 🎯 FORCING immediate modal display for new notification');
        
        // For sales, show immediately without delay
        if (notification.transaction.transaction_type === 'Sale') {
          const currentQueue = notificationQueueRef.current;
          const unhandledIndex = currentQueue.findIndex(n => 
            n.id === newNotification.id || (n.transaction.id === newNotification.transaction.id && !n.isHandled && !n.isDismissed)
          );
          
          if (unhandledIndex !== -1) {
            console.log(`[NotificationContext] 🚨 IMMEDIATE MODAL for Sale at index ${unhandledIndex}`);
            setCurrentNotificationIndex(unhandledIndex);
            setIsNotificationVisible(true);
            
            // Play sale notification sound
            playNotificationSound('Sale');
          }
        } else {
          // Use requestAnimationFrame for purchases
          requestAnimationFrame(() => {
            const currentQueue = notificationQueueRef.current;
            const unhandledIndex = currentQueue.findIndex(n => 
              n.id === newNotification.id || (n.transaction.id === newNotification.transaction.id && !n.isHandled && !n.isDismissed)
            );
            
            if (unhandledIndex !== -1) {
              console.log(`[NotificationContext] 🚨 FORCE SHOWING MODAL at index ${unhandledIndex}`);
              setCurrentNotificationIndex(unhandledIndex);
              setIsNotificationVisible(true);
              
              // Play purchase notification sound
              playNotificationSound('Purchase');
              
              // Double-check after a short delay
              setTimeout(() => {
                if (!isNotificationVisibleRef.current && notificationQueueRef.current.length > 0) {
                  console.log(`[NotificationContext] 🔄 RETRY: Forcing modal visible`);
                  setIsNotificationVisible(true);
                }
              }, 50);
            }
          });
        }
      } else {
        console.log('[NotificationContext] Modal already visible, notification added to queue');
        // Still play sound for queued notification
        playNotificationSound(notification.transaction.transaction_type);
      }
      
    } finally {
      // Remove from processing after a delay to prevent rapid duplicates
      // Shorter delay for sales since they don't need photo processing
      const delay = notification.transaction.transaction_type === 'Sale' ? 500 : 2000;
      setTimeout(() => {
        processingNotificationsRef.current.delete(notificationKey);
      }, delay);
    }
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
        // Play sound for next notification
        const nextNotification = notificationQueue[nextUnhandledIndex];
        if (nextNotification && nextNotification.transaction) {
          playNotificationSound(nextNotification.transaction.transaction_type);
        }
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
          // Play sound for previous notification
          const prevNotification = notificationQueue[previousUnhandledIndex];
          if (prevNotification && prevNotification.transaction) {
            playNotificationSound(prevNotification.transaction.transaction_type);
          }
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
            // Play sound for next notification
            const nextNotification = notificationQueue[nextIndex];
            if (nextNotification && nextNotification.transaction) {
              playNotificationSound(nextNotification.transaction.transaction_type);
            }
          } else {
            // Check for previous notifications
            const prevIndex = notificationQueue.findIndex(
              (n, i) => i < currentNotificationIndex && !n.isHandled && !n.isDismissed && n.id !== currentNotification.id
            );
            
            if (prevIndex !== -1) {
              setCurrentNotificationIndex(prevIndex);
              setIsNotificationVisible(true);
              // Play sound for previous notification
              const prevNotification = notificationQueue[prevIndex];
              if (prevNotification && prevNotification.transaction) {
                playNotificationSound(prevNotification.transaction.transaction_type);
              }
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
      // Play sound for next notification
      const nextNotification = notificationQueue[currentNotificationIndex + 1];
      if (nextNotification && nextNotification.transaction) {
        playNotificationSound(nextNotification.transaction.transaction_type);
      }
    }
  };

  const navigateToPrevious = () => {
    if (currentNotificationIndex > 0) {
      console.log('[NotificationContext] Navigating to previous notification');
      setCurrentNotificationIndex(currentNotificationIndex - 1);
      // Play sound for previous notification
      const prevNotification = notificationQueue[currentNotificationIndex - 1];
      if (prevNotification && prevNotification.transaction) {
        playNotificationSound(prevNotification.transaction.transaction_type);
      }
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
      
      // Load notifications and force display if any exist
      await refreshNotifications();
      
      // After refresh, check if we have unhandled notifications that need display
      setTimeout(() => {
        const unhandled = notificationQueueRef.current.filter(n => !n.isHandled && !n.isDismissed);
        if (unhandled.length > 0 && !isNotificationVisibleRef.current) {
          console.log(`[NotificationContext] Post-init: Force showing modal for ${unhandled.length} unhandled notifications`);
          setCurrentNotificationIndex(0);
          setIsNotificationVisible(true);
          // Play sound for first notification
          if (unhandled[0] && unhandled[0].transaction) {
            playNotificationSound(unhandled[0].transaction.transaction_type);
          }
        }
      }, 500);
      
      setIsInitialized(true);
      console.log('[NotificationContext] Notification provider initialized');
    };

    initializeProvider();
  }, [initializeSession, refreshNotifications, playNotificationSound]);

  // CRITICAL FIX: Real-time subscriptions with immediate modal trigger and proper sales handling
  useEffect(() => {
    if (!isInitialized || !sessionInfo) return;
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      console.log('[NotificationContext] Cleaning up existing subscriptions before creating new ones');
      subscriptionRef.current.forEach((channel: any) => {
        supabase.removeChannel(channel);
      });
      subscriptionRef.current = [];
    }

    console.log('[NotificationContext] Setting up real-time subscriptions with IMMEDIATE MODAL TRIGGERS...');
    
    const channels: any[] = [];
    
    // CRITICAL FIX: Enhanced notification handler that doesn't wait for photos on sales
    const handleTransactionNotification = async (
      payload: any,
      transactionType: 'Purchase' | 'Sale',
      validator: (data: any) => boolean,
      converter: (data: any) => Transaction
    ) => {
      const transactionData = payload.eventType === 'DELETE' ? payload.old : payload.new;
      const transactionId = transactionData?.id;
      const notificationKey = `${transactionId}-${payload.eventType}`;

      console.log(`[NotificationContext] 🚨 REAL-TIME ${transactionType} event:`, {
        eventType: payload.eventType,
        transactionId: transactionId,
        timestamp: new Date().toISOString()
      });

      // Quick validation checks
      const existingNotification = notificationQueueRef.current.find(n => 
        n.transaction.id === transactionId && 
        n.eventType === payload.eventType
      );

      if (existingNotification) {
        console.log(`[NotificationContext] Duplicate in queue: ${notificationKey}`);
        return;
      }

      // CRITICAL: Check if already handled
      const tempCheckId = transactionId;
      if (isNotificationReallyHandled(tempCheckId)) {
        console.log(`[NotificationContext] Skipping already handled: ${notificationKey}`);
        return;
      }
      
      // Also check with the event type in the key
      const fullCheckId = `${transactionId}-${payload.eventType}`;
      if (isNotificationReallyHandled(fullCheckId)) {
        console.log(`[NotificationContext] Skipping already handled (with event type): ${fullCheckId}`);
        return;
      }
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        if (!validator(transactionData)) {
          console.warn(`[NotificationContext] Invalid ${transactionType} data:`, transactionData);
          return;
        }
        
        const transaction = converter(transactionData);
        console.log(`[NotificationContext] 🚀 Processing REAL-TIME ${transactionType}:`, transaction.id);
        
        try {
          // CRITICAL FIX: Only wait for photos on Purchase INSERT events
          if (payload.eventType === 'INSERT' && transactionType === 'Purchase') {
            console.log('[NotificationContext] Waiting 2 seconds for photos on purchase...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else if (transactionType === 'Sale') {
            // For sales, ensure immediate processing
            console.log('[NotificationContext] Processing sale immediately - no photo wait needed');
          }
          
          // Add notification - this will handle its own processing flag
          await addNotification({
            transaction,
            suppliers,
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            priorityLevel: payload.eventType === 'INSERT' ? 'HIGH' : 'MEDIUM',
            requiresAction: payload.eventType === 'INSERT'
          });
          
          console.log(`[NotificationContext] ✅ Real-time ${transactionType} notification processed successfully`);
          
        } catch (error) {
          console.error(`[NotificationContext] Error processing real-time notification:`, error);
          
          // Even if there's an error, try to show the notification
          if (payload.eventType === 'INSERT' && transactionType === 'Sale') {
            console.log('[NotificationContext] Attempting fallback notification display for Sale');
            try {
              const fallbackNotification: NotificationData = {
                id: `fallback-${transactionId}-${Date.now()}`,
                transaction,
                suppliers,
                photos: [],
                eventType: payload.eventType as 'INSERT',
                isHandled: false,
                isDismissed: false,
                timestamp: new Date().toISOString(),
                priorityLevel: 'HIGH',
                requiresAction: true,
                photosFetched: true,
                photoRetryCount: 0
              };
              
              setNotificationQueue(prev => {
                const updated = [...prev, fallbackNotification];
                console.log(`[NotificationContext] Fallback added: ${prev.length} -> ${updated.length}`);
                return updated;
              });
              
              if (!isNotificationVisibleRef.current) {
                setCurrentNotificationIndex(notificationQueueRef.current.length);
                setIsNotificationVisible(true);
                // Play sound for fallback notification
                playNotificationSound('Sale');
              }
            } catch (fallbackError) {
              console.error('[NotificationContext] Fallback also failed:', fallbackError);
            }
          }
        }
      }
    };
    
    // Purchase transactions subscription
    const purchaseChannel = supabase
      .channel(`purchase-transactions-${sessionInfo.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => handleTransactionNotification(
          payload,
          'Purchase',
          isValidPurchaseTransaction,
          convertPurchaseTransaction
        )
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Purchase subscription status:', status);
      });
    
    channels.push(purchaseChannel);

    // Sales transactions subscription
    const salesChannel = supabase
      .channel(`sales-transactions-${sessionInfo.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_transactions'
        },
        (payload) => handleTransactionNotification(
          payload,
          'Sale',
          isValidSalesTransaction,
          convertSalesTransaction
        )
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Sales subscription status:', status);
      });
    
    channels.push(salesChannel);

    // Photo uploads subscription (only for purchases)
    const photoChannel = supabase
      .channel(`photo-uploads-${sessionInfo.sessionId}`)
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
    
    channels.push(photoChannel);

    // Notification states subscription - ENHANCED for cross-session sync
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
          console.log('[NotificationContext] Notification state updated:', {
            id: updatedState.id,
            is_handled: updatedState.is_handled,
            is_dismissed: updatedState.is_dismissed,
            by_session: updatedState.handled_session,
            current_session: sessionInfo?.sessionId
          });
          
          // Process updates from ALL sessions (including other devices/browsers)
          if (updatedState.is_handled || updatedState.is_dismissed) {
            // Check if this was handled by another session
            const isFromAnotherSession = updatedState.handled_session !== sessionInfo?.sessionId;
            
            if (isFromAnotherSession) {
              console.log(`[NotificationContext] Notification ${updatedState.id} was ${updatedState.is_handled ? 'handled' : 'dismissed'} by another session`);
              
              // Add to localStorage to prevent recovery
              if (updatedState.is_handled) {
                const handledKey = `handled_${updatedState.id}`;
                localStorage.setItem(handledKey, JSON.stringify({
                  notificationId: updatedState.id,
                  handledAt: updatedState.handled_at || new Date().toISOString(),
                  sessionId: updatedState.handled_session,
                  fromAnotherSession: true,
                  permanent: true
                }));
              } else if (updatedState.is_dismissed) {
                const dismissedKey = `dismissed_${updatedState.id}`;
                localStorage.setItem(dismissedKey, JSON.stringify({
                  notificationId: updatedState.id,
                  dismissedAt: updatedState.handled_at || new Date().toISOString(),
                  sessionId: updatedState.handled_session,
                  fromAnotherSession: true
                }));
              }
            }
            
            // Remove from notification queue immediately
            setNotificationQueue(prev => {
              const filtered = prev.filter(n => n.id !== updatedState.id);
              console.log(`[NotificationContext] Removed notification from queue: ${prev.length} -> ${filtered.length}`);
              
              // If the removed notification was the current one being viewed, handle navigation
              const currentNotification = prev[currentNotificationIndex];
              if (currentNotification?.id === updatedState.id) {
                console.log('[NotificationContext] Current notification was handled by another session, navigating...');
                
                // Find next unhandled notification
                const nextUnhandled = filtered.find((n, index) => !n.isHandled && !n.isDismissed);
                if (nextUnhandled) {
                  const newIndex = filtered.findIndex(n => n.id === nextUnhandled.id);
                  setCurrentNotificationIndex(newIndex);
                } else {
                  // No more notifications, close the panel
                  setIsNotificationVisible(false);
                  setCurrentNotificationIndex(0);
                }
              } else if (currentNotificationIndex >= filtered.length && filtered.length > 0) {
                // Adjust index if it's now out of bounds
                setCurrentNotificationIndex(filtered.length - 1);
              }
              
              return filtered;
            });
            
            // Remove from bell notifications
            setBellNotifications(prev => {
              const filtered = prev.filter(n => n.id !== updatedState.id);
              console.log(`[NotificationContext] Removed from bell notifications: ${prev.length} -> ${filtered.length}`);
              return filtered;
            });
            
            // Remove from read notifications set if it was there
            setReadBellNotifications(prev => {
              const newSet = new Set(prev);
              newSet.delete(updatedState.id);
              return newSet;
            });
            
            // Force refresh bell notifications to ensure sync
            loadBellNotifications().catch(error => {
              console.error('[NotificationContext] Error refreshing bell notifications:', error);
            });
            
            if (isFromAnotherSession) {
              // Show temporary alert
              setCrossSessionAlert(`Notification ${updatedState.is_handled ? 'completed' : 'dismissed'} on another device`);
              setTimeout(() => setCrossSessionAlert(null), 3000);
              console.log(`[NotificationContext] ✅ Notification handled on another device`);
            }
          } else {
            // Update notification properties if not handled/dismissed
            setNotificationQueue(prev => 
              prev.map(n => n.id === updatedState.id ? {
                ...n,
                isHandled: updatedState.is_handled,
                isDismissed: updatedState.is_dismissed,
                handledAt: updatedState.handled_at || undefined,
                handledBy: updatedState.handled_by || undefined
              } : n)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notification_states'
        },
        (payload) => {
          const deletedState = payload.old;
          console.log('[NotificationContext] Notification state deleted:', deletedState.id);
          
          // Remove from both queues when deleted
          setNotificationQueue(prev => {
            const filtered = prev.filter(n => n.id !== deletedState.id);
            
            // Handle current notification being deleted
            const currentNotification = prev[currentNotificationIndex];
            if (currentNotification?.id === deletedState.id) {
              console.log('[NotificationContext] Current notification was deleted, navigating...');
              
              const nextUnhandled = filtered.find(n => !n.isHandled && !n.isDismissed);
              if (nextUnhandled) {
                const newIndex = filtered.findIndex(n => n.id === nextUnhandled.id);
                setCurrentNotificationIndex(newIndex);
              } else {
                setIsNotificationVisible(false);
                setCurrentNotificationIndex(0);
              }
            }
            
            return filtered;
          });
          
          setBellNotifications(prev => prev.filter(n => n.id !== deletedState.id));
          
          // Add to handled list to prevent recovery
          const handledKey = `handled_${deletedState.id}`;
          localStorage.setItem(handledKey, JSON.stringify({
            notificationId: deletedState.id,
            handledAt: new Date().toISOString(),
            deleted: true,
            permanent: true
          }));
        }
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Notification states subscription status:', status);
      });

    channels.push(notificationStatesChannel);

    // Store channels reference for cleanup
    subscriptionRef.current = channels;

    return () => {
      console.log('[NotificationContext] Cleaning up subscriptions');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [isInitialized, sessionInfo, suppliers, addNotification, loadBellNotifications, currentNotificationIndex, playNotificationSound]);

  // Session heartbeat
  useEffect(() => {
    if (!sessionInfo) return;

    const heartbeatInterval = setInterval(updateSessionHeartbeat, 30000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionInfo, updateSessionHeartbeat]);

  // Periodic sync check for cross-session updates - NEW
  useEffect(() => {
    if (!sessionInfo || !isInitialized) return;

    // Check for handled notifications from other sessions every 10 seconds
    const syncInterval = setInterval(async () => {
      try {
        // Get IDs of current notifications
        const currentIds = notificationQueue.map(n => n.id);
        
        if (currentIds.length === 0) return;
        
        // Check their status in the database
        const { data: dbStates, error } = await supabase
          .from('notification_states')
          .select('id, is_handled, is_dismissed, handled_session')
          .in('id', currentIds);
        
        if (error) {
          console.error('[NotificationContext] Error checking notification states:', error);
          return;
        }
        
        // Find notifications that were handled/dismissed by other sessions
        const toRemove: string[] = [];
        
        dbStates?.forEach(dbState => {
          if ((dbState.is_handled || dbState.is_dismissed) && dbState.handled_session !== sessionInfo.sessionId) {
            toRemove.push(dbState.id);
            console.log(`[NotificationContext] Sync check: Found notification ${dbState.id} ${dbState.is_handled ? 'handled' : 'dismissed'} by another session`);
            
            // Add to localStorage
            if (dbState.is_handled) {
              const handledKey = `handled_${dbState.id}`;
              localStorage.setItem(handledKey, JSON.stringify({
                notificationId: dbState.id,
                handledAt: new Date().toISOString(),
                sessionId: dbState.handled_session,
                fromSync: true,
                permanent: true
              }));
            }
          }
        });
        
        // Remove handled/dismissed notifications
        if (toRemove.length > 0) {
          setNotificationQueue(prev => {
            const filtered = prev.filter(n => !toRemove.includes(n.id));
            console.log(`[NotificationContext] Sync check: Removing ${toRemove.length} notifications handled elsewhere`);
            
            // Handle current notification being removed
            const currentNotification = prev[currentNotificationIndex];
            if (currentNotification && toRemove.includes(currentNotification.id)) {
              const nextUnhandled = filtered.find(n => !n.isHandled && !n.isDismissed);
              if (nextUnhandled) {
                const newIndex = filtered.findIndex(n => n.id === nextUnhandled.id);
                setCurrentNotificationIndex(newIndex);
              } else {
                setIsNotificationVisible(false);
                setCurrentNotificationIndex(0);
              }
            }
            
            return filtered;
          });
          
          setBellNotifications(prev => prev.filter(n => !toRemove.includes(n.id)));
        }
      } catch (error) {
        console.error('[NotificationContext] Error in periodic sync:', error);
      }
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(syncInterval);
    };
  }, [sessionInfo, isInitialized, notificationQueue, currentNotificationIndex]);

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
    crossSessionAlert,
    
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