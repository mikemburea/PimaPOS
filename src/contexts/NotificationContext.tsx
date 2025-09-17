// src/contexts/NotificationContext.tsx - FIXED: Never recover handled notifications from audit log
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

// CRITICAL: Helper function to check if notification is handled - ENHANCED to be more strict
const isNotificationReallyHandled = (notificationId: string): boolean => {
  // FIXED: More comprehensive check - only use notificationId as the key
  const handledKey = `handled_${notificationId}`;
  const dismissedKey = `dismissed_${notificationId}`;
  
  return localStorage.getItem(handledKey) !== null || localStorage.getItem(dismissedKey) !== null;
};

// NEW: Create unique transaction key for deduplication
const createTransactionKey = (transactionId: string, eventType: string): string => {
  return `${transactionId}-${eventType}`;
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
  
  // CRITICAL FIX: Enhanced deduplication tracking
  const notificationQueueRef = useRef<NotificationData[]>([]);
  const processingTransactionsRef = useRef<Set<string>>(new Set()); // Track by transaction ID + event type
  const activeTransactionsRef = useRef<Map<string, string>>(new Map()); // Map transaction key to notification ID
  const subscriptionRef = useRef<any>(null);
  const isNotificationVisibleRef = useRef<boolean>(false);
  
  // NEW: Track handled transaction IDs to prevent recovery
  const handledTransactionsRef = useRef<Set<string>>(new Set());

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
  
  // CRITICAL: Memoize functions to prevent constant recreation
  const playNotificationSoundMemo = useCallback((transactionType: 'Purchase' | 'Sale') => {
    try {
      const soundFile = transactionType === 'Purchase' 
        ? '/notification-one.mp3' 
        : '/notification-two.mp3';
      
      const audio = new Audio(soundFile);
      audio.volume = 0.6;
      
      audio.play().catch(error => {
        console.warn(`[NotificationContext] Could not play notification sound:`, error);
      });
      
      console.log(`[NotificationContext] Playing ${transactionType} notification sound: ${soundFile}`);
    } catch (error) {
      console.warn('[NotificationContext] Error setting up notification sound:', error);
    }
  }, []);

  // ===== CRITICAL FIX: Check if transaction was ever handled =====
  const wasTransactionEverHandled = useCallback(async (transactionId: string, transactionTable: string, eventType: string): Promise<boolean> => {
    try {
      // CRITICAL: Check notification_audit_log to see if this transaction was EVER handled
      const { data: auditLogs, error: auditError } = await supabase
        .from('notification_audit_log')
        .select('*')
        .eq('action', 'HANDLED')
        .limit(1000); // Get recent audit logs

      if (!auditError && auditLogs && auditLogs.length > 0) {
        // Check if any audit log shows this transaction was handled
        for (const log of auditLogs) {
          if (log.new_state && 
              log.new_state.transaction_id === transactionId &&
              log.new_state.transaction_table === transactionTable &&
              log.new_state.event_type === eventType &&
              log.new_state.is_handled === true) {
            console.log(`[NotificationContext] 🚫 Transaction ${transactionId} was previously handled according to audit log`);
            handledTransactionsRef.current.add(createTransactionKey(transactionId, eventType));
            return true;
          }
        }
      }

      // Also check current notification_states for handled notifications
      const { data: existingState, error: stateError } = await supabase
        .from('notification_states')
        .select('is_handled, is_dismissed')
        .eq('transaction_id', transactionId)
        .eq('transaction_table', transactionTable)
        .eq('event_type', eventType)
        .single();

      if (!stateError && existingState) {
        if (existingState.is_handled || existingState.is_dismissed) {
          console.log(`[NotificationContext] 🚫 Transaction ${transactionId} is already handled/dismissed in notification_states`);
          handledTransactionsRef.current.add(createTransactionKey(transactionId, eventType));
          return true;
        }
      }

      // Check localStorage as well
      const transactionKey = createTransactionKey(transactionId, eventType);
      if (handledTransactionsRef.current.has(transactionKey)) {
        console.log(`[NotificationContext] 🚫 Transaction ${transactionId} is in handled cache`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotificationContext] Error checking if transaction was handled:', error);
      // Err on the side of caution - if we can't check, assume it might have been handled
      return true;
    }
  }, []);

  // ===== CRITICAL FIX: STRICT UNHANDLED-ONLY RECOVERY SYSTEM =====
  
  /**
   * FIXED: Only create notifications for NEW transactions that were NEVER handled
   * NEVER recover from audit log - only create for truly new transactions
   */
  const createMissingNotifications = useCallback(async (): Promise<number> => {
    const CREATION_TIMEOUT = 15000; // 15 second timeout
    
    try {
      console.log('[NotificationContext] 🔍 Checking for NEW transactions without notifications (NEVER recovering handled)...');
      
      // Create timeout promise
      const timeoutPromise = new Promise<number>((_, reject) => {
        setTimeout(() => reject(new Error('Creation timeout')), CREATION_TIMEOUT);
      });
      
      // Create checking promise
      const checkingPromise = (async (): Promise<number> => {
        // STEP 1: Get ALL handled transactions from audit log first
        console.log('[NotificationContext] STEP 1: Loading handled transactions from audit log to prevent recovery...');
        const { data: auditLogs, error: auditError } = await supabase
          .from('notification_audit_log')
          .select('new_state')
          .eq('action', 'HANDLED')
          .limit(5000); // Get more audit logs to ensure we don't miss any

        const handledTransactionKeys = new Set<string>();
        if (!auditError && auditLogs) {
          auditLogs.forEach(log => {
            if (log.new_state && 
                log.new_state.transaction_id && 
                log.new_state.event_type &&
                log.new_state.is_handled === true) {
              const key = createTransactionKey(log.new_state.transaction_id, log.new_state.event_type);
              handledTransactionKeys.add(key);
              handledTransactionsRef.current.add(key);
            }
          });
          console.log(`[NotificationContext] Found ${handledTransactionKeys.size} handled transactions in audit log`);
        }

        // STEP 2: Get existing notifications from notification_states ONLY
        const { data: existingNotifications, error: existingError } = await supabase
          .from('notification_states')
          .select('transaction_id, transaction_table, event_type, is_handled, is_dismissed, created_at')
          .limit(1000); // Prevent overwhelming queries

        if (existingError) {
          console.error('Error fetching existing notifications:', existingError);
          return 0;
        }

        const existingNotificationKeys = new Set(
          (existingNotifications || []).map(n => {
            const key = `${n.transaction_table}-${n.transaction_id}-${n.event_type}`;
            // Also track handled ones
            if (n.is_handled || n.is_dismissed) {
              const transactionKey = createTransactionKey(n.transaction_id, n.event_type);
              handledTransactionKeys.add(transactionKey);
              handledTransactionsRef.current.add(transactionKey);
            }
            return key;
          })
        );

        console.log(`[NotificationContext] Found ${existingNotificationKeys.size} existing notifications in notification_states`);

        // STEP 3: Only check RECENT transactions (last 2 hours) to avoid creating old notifications
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        // Get NEW purchase transactions ONLY
        const { data: purchaseTransactions, error: purchaseError } = await supabase
          .from('transactions')
          .select(`
            id, created_at, transaction_number, material_type, total_amount,
            supplier_id, is_walkin, walkin_name, walkin_phone, material_category,
            weight_kg, unit_price, payment_method, payment_status, notes,
            supplier_name, created_by, updated_at, transaction_date
          `)
          .gte('created_at', twoHoursAgo) // ONLY recent transactions
          .order('created_at', { ascending: false })
          .limit(50); // Reasonable limit

        if (purchaseError) {
          console.error('Error fetching recent purchase transactions:', purchaseError);
          return 0;
        }

        // Get NEW sales transactions ONLY
        const { data: salesTransactions, error: salesError } = await supabase
          .from('sales_transactions')
          .select(`
            id, created_at, transaction_id, material_name, total_amount,
            supplier_id, supplier_name, weight_kg, price_per_kg, payment_method,
            payment_status, notes, is_special_price, original_price, material_id,
            created_by, updated_at, transaction_date
          `)
          .gte('created_at', twoHoursAgo) // ONLY recent transactions
          .order('created_at', { ascending: false })
          .limit(50); // Reasonable limit

        if (salesError) {
          console.error('Error fetching recent sales transactions:', salesError);
          return 0;
        }

        console.log(`[NotificationContext] Found ${purchaseTransactions?.length || 0} recent purchase, ${salesTransactions?.length || 0} recent sales transactions`);

        let missingCount = 0;
        const notificationsToCreate: any[] = [];

        // STEP 4: Check ONLY for missing INSERT notifications for recent transactions that were NEVER handled
        for (const tx of purchaseTransactions || []) {
          const notificationKey = `transactions-${tx.id}-INSERT`;
          const transactionKey = createTransactionKey(tx.id, 'INSERT');
          
          // CRITICAL: Skip if this transaction was EVER handled
          if (handledTransactionKeys.has(transactionKey)) {
            console.log(`[NotificationContext] ⛔ Skipping transaction ${tx.id} - was previously handled`);
            continue;
          }

          // CRITICAL: Double-check against audit log
          const wasHandled = await wasTransactionEverHandled(tx.id, 'transactions', 'INSERT');
          if (wasHandled) {
            console.log(`[NotificationContext] ⛔ Skipping transaction ${tx.id} - audit log confirms it was handled`);
            continue;
          }
          
          if (!existingNotificationKeys.has(notificationKey)) {
            console.log(`[NotificationContext] 🔍 Found NEW purchase transaction without notification (never handled): ${tx.id}`);
            
            // Transform to unified Transaction interface
            const unifiedTransaction: Transaction = {
              id: tx.id,
              transaction_type: 'Purchase' as const,
              supplier_id: tx.supplier_id,
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
              notes: tx.notes,
              created_by: tx.created_by,
              updated_at: tx.updated_at,
              supplier_name: tx.supplier_name
            };

            const expiresAt = new Date(new Date(tx.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
            
            notificationsToCreate.push({
              transaction_id: tx.id,
              transaction_table: 'transactions',
              event_type: 'INSERT',
              notification_data: {
                transaction: unifiedTransaction,
                eventType: 'INSERT',
                timestamp: tx.created_at
              },
              is_handled: false,
              is_dismissed: false,
              priority_level: 'HIGH',
              requires_action: true,
              expires_at: expiresAt,
              created_at: tx.created_at
            });
            
            missingCount++;
          }
        }

        // Check sales transactions for missing notifications
        for (const tx of salesTransactions || []) {
          const notificationKey = `sales_transactions-${tx.id}-INSERT`;
          const transactionKey = createTransactionKey(tx.id, 'INSERT');
          
          // CRITICAL: Skip if this transaction was EVER handled
          if (handledTransactionKeys.has(transactionKey)) {
            console.log(`[NotificationContext] ⛔ Skipping sales transaction ${tx.id} - was previously handled`);
            continue;
          }

          // CRITICAL: Double-check against audit log
          const wasHandled = await wasTransactionEverHandled(tx.id, 'sales_transactions', 'INSERT');
          if (wasHandled) {
            console.log(`[NotificationContext] ⛔ Skipping sales transaction ${tx.id} - audit log confirms it was handled`);
            continue;
          }
          
          if (!existingNotificationKeys.has(notificationKey)) {
            console.log(`[NotificationContext] 🔍 Found NEW sales transaction without notification (never handled): ${tx.id}`);
            
            const unifiedTransaction: Transaction = {
              id: tx.id,
              transaction_type: 'Sale' as const,
              supplier_id: tx.supplier_id,
              material_type: tx.material_name,
              transaction_date: tx.transaction_date,
              total_amount: tx.total_amount,
              created_at: tx.created_at,
              transaction_id: tx.transaction_id,
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
              supplier_name: tx.supplier_name
            };

            const expiresAt = new Date(new Date(tx.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
            
            notificationsToCreate.push({
              transaction_id: tx.id,
              transaction_table: 'sales_transactions',
              event_type: 'INSERT',
              notification_data: {
                transaction: unifiedTransaction,
                eventType: 'INSERT',
                timestamp: tx.created_at
              },
              is_handled: false,
              is_dismissed: false,
              priority_level: 'HIGH',
              requires_action: true,
              expires_at: expiresAt,
              created_at: tx.created_at
            });
            
            missingCount++;
          }
        }

        // STEP 5: Create notifications for NEW transactions only (that were NEVER handled)
        if (notificationsToCreate.length > 0) {
          console.log(`[NotificationContext] 🚀 Creating ${notificationsToCreate.length} notifications for NEW transactions (never handled)...`);
          
          const { data: createdNotifications, error: createError } = await supabase
            .from('notification_states')
            .insert(notificationsToCreate)
            .select();

          if (createError) {
            console.error('Error creating notifications for new transactions:', createError);
            return 0;
          }

          const createdCount = createdNotifications?.length || 0;
          console.log(`[NotificationContext] ✅ Successfully created ${createdCount} notifications for NEW transactions (never handled)`);
          return createdCount;
        }

        console.log(`[NotificationContext] 🔍 No NEW unhandled transactions requiring notifications found`);
        return 0;
      })();
      
      // Race against timeout
      return await Promise.race([checkingPromise, timeoutPromise]);
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Creation timeout') {
        console.warn('[NotificationContext] New transaction check timed out - continuing without creation');
        return 0;
      }
      console.error('[NotificationContext] Error checking for new transactions:', error);
      return 0;
    }
  }, [wasTransactionEverHandled]);

  // CRITICAL: Memoize bell notifications loading with timeout protection - STRICT unhandled only
  const loadBellNotificationsMemo = useCallback(async () => {
    const BELL_TIMEOUT = 8000; // 8 second timeout
    
    try {
      console.log('[NotificationContext] Loading bell notifications (STRICT unhandled only from notification_states)...');
      
      // Create timeout promise
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Bell notifications timeout')), BELL_TIMEOUT);
      });
      
      // Create loading promise
      const loadingPromise = (async () => {
        // CRITICAL FIX: ONLY query notification_states table with strict conditions
        const { data: notificationStates, error } = await supabase
          .from('notification_states') // ONLY notification_states, NEVER notification_audit_log
          .select('*')
          .eq('is_handled', false)     // MUST be unhandled
          .eq('is_dismissed', false)   // MUST not be dismissed
          .order('created_at', { ascending: false })
          .limit(100); // Prevent excessive loading

        if (error) {
          console.error('Error loading bell notifications from notification_states:', error);
          return;
        }

        const processedStates = new Map<string, any>();
        
        // TRIPLE CHECK: Additional strict filtering
        const strictlyUnhandledStates = (notificationStates || []).filter(state => {
          // Database check
          if (state.is_handled === true || state.is_dismissed === true) {
            console.warn(`[NotificationContext] 🚨 Filtering out handled/dismissed from bell: ${state.id}`);
            return false;
          }
          
          // LocalStorage check
          if (isNotificationReallyHandled(state.id)) {
            console.log(`[NotificationContext] Excluding locally handled notification ${state.id} from bell`);
            return false;
          }
          
          // Check against handled transactions cache
          const transactionKey = createTransactionKey(state.transaction_id, state.event_type);
          if (handledTransactionsRef.current.has(transactionKey)) {
            console.log(`[NotificationContext] Excluding previously handled transaction ${transactionKey} from bell`);
            return false;
          }
          
          // Deduplication check
          if (processedStates.has(transactionKey)) {
            console.log(`[NotificationContext] Bell: Skipping duplicate transaction key: ${transactionKey}`);
            return false;
          }
          
          processedStates.set(transactionKey, state);
          return true;
        });

        const bellNotifs: BellNotification[] = strictlyUnhandledStates.map(state => {
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
        console.log(`[NotificationContext] Loaded ${bellNotifs.length} STRICTLY UNHANDLED bell notifications from notification_states only`);
      })();

      // Race against timeout
      await Promise.race([loadingPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Bell notifications timeout') {
        console.warn('[NotificationContext] Bell notifications loading timed out');
        setBellNotifications([]); // Set safe default
      } else {
        console.error('Error loading bell notifications:', error);
        setBellNotifications([]); // Set safe default
      }
    }
  }, []);

  // CRITICAL: Enhanced refresh notifications - STRICT notification_states only recovery
  const refreshNotificationsMemo = useCallback(async () => {
    const REFRESH_TIMEOUT = 20000; // 20 second timeout for comprehensive refresh
    
    try {
      console.log('[NotificationContext] 🔄 Starting STRICT notification_states-only refresh (NO handled recovery)...');
      
      // Create timeout promise
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Comprehensive refresh timeout')), REFRESH_TIMEOUT);
      });
      
      // Create refresh promise
      const refreshPromise = (async () => {
        // STEP 1: Check for NEW transactions first (NOT recovery from audit log)
        console.log('[NotificationContext] STEP 1: Checking for NEW transactions without notifications (never handled)...');
        const newTransactionCount = await createMissingNotifications();
        
        if (newTransactionCount > 0) {
          console.log(`[NotificationContext] ✅ Created ${newTransactionCount} notifications for NEW unhandled transactions`);
        }
        
        // STEP 2: Load STRICTLY unhandled notifications from notification_states ONLY
        console.log('[NotificationContext] STEP 2: Loading STRICTLY unhandled notifications from notification_states...');
        const notifications = await loadNotificationsFromDB();
        
        // STEP 3: Apply SUPER STRICT filtering
        const strictlyUnhandledNotifications = notifications.filter(n => {
          // Database status check
          if (n.isHandled === true || n.isDismissed === true) {
            console.error(`[NotificationContext] 🚨 CRITICAL: Handled/dismissed notification ${n.id} in refresh - blocking`);
            return false;
          }
          
          // LocalStorage check
          if (isNotificationReallyHandled(n.id)) {
            console.log(`[NotificationContext] Excluding locally handled notification ${n.id} from refresh`);
            return false;
          }
          
          // Check against handled transactions cache
          const transactionKey = createTransactionKey(n.transaction.id, n.eventType);
          if (handledTransactionsRef.current.has(transactionKey)) {
            console.log(`[NotificationContext] Excluding previously handled transaction ${transactionKey} from refresh`);
            return false;
          }
          
          return true;
        });
        
        // STEP 4: Deduplicate notifications
        const deduplicatedNotifications = new Map<string, NotificationData>();
        strictlyUnhandledNotifications.forEach(notification => {
          const transactionKey = createTransactionKey(notification.transaction.id, notification.eventType);
          if (!deduplicatedNotifications.has(transactionKey)) {
            deduplicatedNotifications.set(transactionKey, notification);
          } else {
            console.log(`[NotificationContext] Refresh: Removing duplicate notification for ${transactionKey}`);
          }
        });
        
        const finalNotifications = Array.from(deduplicatedNotifications.values());
        
        // STEP 5: Update state
        setNotificationQueue(finalNotifications);
        
        // STEP 6: Update tracking refs
        activeTransactionsRef.current.clear();
        finalNotifications.forEach(notification => {
          const transactionKey = createTransactionKey(notification.transaction.id, notification.eventType);
          activeTransactionsRef.current.set(transactionKey, notification.id);
        });
        
        // STEP 7: Force show modal if there are unhandled notifications
        if (finalNotifications.length > 0 && !isNotificationVisible) {
          console.log(`[NotificationContext] 🚨 FORCING MODAL for ${finalNotifications.length} strictly unhandled notifications from refresh`);
          setCurrentNotificationIndex(0);
          setIsNotificationVisible(true);
          
          if (finalNotifications[0] && finalNotifications[0].transaction) {
            playNotificationSoundMemo(finalNotifications[0].transaction.transaction_type);
          }
        }
        
        // STEP 8: Refresh bell notifications
        await loadBellNotificationsMemo();
        
        console.log(`[NotificationContext] ✅ STRICT refresh completed: ${finalNotifications.length} unhandled notifications (filtered from ${notifications.length} total, ${newTransactionCount} new created)`);
      })();

      // Race against timeout
      await Promise.race([refreshPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Comprehensive refresh timeout') {
        console.warn('[NotificationContext] Comprehensive refresh timed out - setting safe defaults');
        // Don't clear existing notifications, just log the timeout
        await loadBellNotificationsMemo(); // Try to at least load bell notifications
      } else {
        console.error('Error refreshing notifications:', error);
      }
    }
  }, [createMissingNotifications, loadBellNotificationsMemo, isNotificationVisible, playNotificationSoundMemo]);

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

  // Initialize session with timeout protection
  const initializeSession = useCallback(async () => {
    const SESSION_TIMEOUT = 8000; // 8 second timeout
    
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

      // Create timeout promise
      const timeoutPromise = new Promise<SessionInfo>((_, reject) => {
        setTimeout(() => reject(new Error('Session initialization timeout')), SESSION_TIMEOUT);
      });

      // Create session promise
      const sessionPromise = (async (): Promise<SessionInfo> => {
        // Try to register session in database
        try {
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
            console.warn('Failed to initialize session in database:', error);
            // Continue with local session anyway
          }
        } catch (error) {
          console.warn('Database session registration failed:', error);
          // Continue with local session anyway
        }

        return {
          sessionId,
          userIdentifier,
          deviceInfo
        };
      })();

      // Race against timeout
      const session = await Promise.race([sessionPromise, timeoutPromise]);
      setSessionInfo(session);
      return session;
    } catch (error) {
      if (error instanceof Error && error.message === 'Session initialization timeout') {
        console.warn('[NotificationContext] Session initialization timed out, using fallback');
      } else {
        console.error('Error initializing session:', error);
      }
      
      // Create fallback session
      const fallbackSession = {
        sessionId: generateSessionId(),
        userIdentifier,
        deviceInfo: { fallback: true, timestamp: new Date().toISOString() }
      };
      setSessionInfo(fallbackSession);
      return fallbackSession;
    }
  }, [userIdentifier, generateSessionId]);

  // Update session heartbeat with error handling
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
      console.warn('Failed to update session heartbeat:', error);
      // Don't throw - heartbeat failures shouldn't break the app
    }
  }, [sessionInfo?.sessionId]);

  // ===== PHOTO MANAGEMENT =====

  // Improved photo fetching with timeout and retry logic
  const fetchTransactionPhotos = async (transactionId: string, retryCount = 0): Promise<TransactionPhoto[]> => {
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
    const PHOTO_TIMEOUT = 8000; // 8 second timeout per attempt
    
    console.log(`[NotificationContext] Fetching photos for transaction: ${transactionId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<TransactionPhoto[]>((_, reject) => {
        setTimeout(() => reject(new Error('Photo fetch timeout')), PHOTO_TIMEOUT);
      });
      
      // Create fetch promise
      const fetchPromise = (async (): Promise<TransactionPhoto[]> => {
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
          .order('upload_order', { ascending: true })
          .limit(20); // Prevent excessive photo loading

        if (error) {
          console.error('[NotificationContext] Database error fetching transaction photos:', error);
          throw error;
        }

        const photos = data || [];
        console.log(`[NotificationContext] Database query returned ${photos.length} photos for transaction ${transactionId}`);
        
        if (photos.length === 0 && retryCount < maxRetries) {
          // Check if this is a very recent transaction (photos might still be uploading)
          const transactionAge = txData ? Date.now() - new Date(txData.created_at).getTime() : 0;
          const isRecentTransaction = transactionAge < 30000; // 30 seconds
          
          if (isRecentTransaction) {
            console.log(`[NotificationContext] Recent transaction (${Math.round(transactionAge / 1000)}s old), will retry in ${retryDelay}ms...`);
            throw new Error('Photos may still be uploading - retry needed');
          }
        }
        
        return photos;
      })();

      // Race fetch against timeout
      return await Promise.race([fetchPromise, timeoutPromise]);
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Photo fetch timeout') {
          console.warn(`[NotificationContext] Photo fetch timed out for transaction ${transactionId}`);
        } else if (error.message === 'Photos may still be uploading - retry needed') {
          // Retry logic for recent transactions
          if (retryCount < maxRetries) {
            console.log(`[NotificationContext] Retrying photo fetch for transaction ${transactionId} in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchTransactionPhotos(transactionId, retryCount + 1);
          }
        } else {
          console.error('[NotificationContext] Unexpected error fetching transaction photos:', error);
        }
      }
      
      // Retry on errors if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(`[NotificationContext] Retrying photo fetch after error for transaction ${transactionId} in ${retryDelay}ms...`);
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
      console.log('[NotificationContext] Saving notification to notification_states:', notification.transaction.id);
      
      // Calculate expiry (24 hours for most notifications, 1 hour for DELETE events)
      const hoursToExpiry = notification.eventType === 'DELETE' ? 1 : 24;
      const expiresAt = new Date(Date.now() + hoursToExpiry * 60 * 60 * 1000).toISOString();
      
      // Determine correct table name based on transaction type
      const transactionTable = notification.transaction.transaction_type === 'Purchase' ? 'transactions' : 'sales_transactions';
      
      // CRITICAL: Check if this transaction was ever handled before saving
      const transactionKey = createTransactionKey(notification.transaction.id, notification.eventType);
      if (handledTransactionsRef.current.has(transactionKey)) {
        console.log(`[NotificationContext] ⛔ NOT saving notification - transaction ${notification.transaction.id} was previously handled`);
        return null;
      }
      
      // CRITICAL: Save to notification_states ONLY, never to notification_audit_log
      const { data, error } = await supabase
        .from('notification_states') // ONLY notification_states table
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
        console.error('Error saving notification to notification_states:', error);
        return null;
      }

      console.log('[NotificationContext] Notification saved to notification_states with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error saving notification to notification_states:', error);
      return null;
    }
  };

  // Update notification in database
  const updateNotificationInDB = async (notificationId: string, updates: Partial<NotificationStateRow>): Promise<boolean> => {
    try {
      // CRITICAL: Update notification_states ONLY, never notification_audit_log
      const { error } = await supabase
        .from('notification_states') // ONLY notification_states table
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error updating notification in notification_states:', error);
        return false;
      }

      console.log('[NotificationContext] Notification updated in notification_states:', notificationId);
      return true;
    } catch (error) {
      console.error('Error updating notification in notification_states:', error);
      return false;
    }
  };

  // CRITICAL FIX: Enhanced loadNotificationsFromDB function - STRICT notification_states only
  const loadNotificationsFromDB = async (): Promise<NotificationData[]> => {
    try {
      console.log('[NotificationContext] Loading STRICTLY UNHANDLED notifications from notification_states ONLY...');
      
      // CRITICAL: Load ONLY from notification_states where NOT handled AND NOT dismissed
      const { data: notificationStates, error } = await supabase
        .from('notification_states')  // ONLY notification_states, NEVER notification_audit_log
        .select('*')
        .eq('is_handled', false)  // MUST be unhandled
        .eq('is_dismissed', false) // MUST not be dismissed
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading notifications from notification_states:', error);
        return [];
      }

      if (!notificationStates?.length) {
        console.log('[NotificationContext] No strictly unhandled notifications found in notification_states');
        return [];
      }

      // QUADRUPLE-CHECK: Filter out ANY handled/dismissed notifications
      const strictlyUnhandledStates = notificationStates.filter(state => {
        // Check database flags
        if (state.is_handled === true || state.is_dismissed === true) {
          console.warn(`[NotificationContext] 🚨 CRITICAL: Filtering out handled/dismissed notification ${state.id} from notification_states query`);
          // Track as handled to prevent future recovery
          const transactionKey = createTransactionKey(state.transaction_id, state.event_type);
          handledTransactionsRef.current.add(transactionKey);
          return false;
        }
        
        // Check localStorage (belt and suspenders)
        if (isNotificationReallyHandled(state.id)) {
          console.log(`[NotificationContext] Filtering out locally handled/dismissed notification: ${state.id}`);
          const transactionKey = createTransactionKey(state.transaction_id, state.event_type);
          handledTransactionsRef.current.add(transactionKey);
          return false;
        }
        
        // Check against handled transactions cache
        const transactionKey = createTransactionKey(state.transaction_id, state.event_type);
        if (handledTransactionsRef.current.has(transactionKey)) {
          console.log(`[NotificationContext] Filtering out previously handled transaction: ${transactionKey}`);
          return false;
        }
        
        return true;
      });

      console.log(`[NotificationContext] Found ${strictlyUnhandledStates.length} STRICTLY unhandled notifications from notification_states (from ${notificationStates.length} total)`);
      
      // Transform database rows to NotificationData with DEDUPLICATION
      const notifications: NotificationData[] = [];
      const seenTransactionKeys = new Set<string>();
      
      for (const state of strictlyUnhandledStates) {
        try {
          const notificationData = state.notification_data;
          const transaction = notificationData.transaction;
          
          // CRITICAL: Create deduplication key
          const transactionKey = createTransactionKey(transaction.id, state.event_type);
          
          // Skip if we already have this transaction + event type combination
          if (seenTransactionKeys.has(transactionKey)) {
            console.log(`[NotificationContext] Skipping duplicate transaction key: ${transactionKey}`);
            continue;
          }
          
          seenTransactionKeys.add(transactionKey);
          
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
            isHandled: false, // ALWAYS false since we filtered strictly
            isDismissed: false, // ALWAYS false since we filtered strictly
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

      console.log(`[NotificationContext] Returning ${notifications.length} STRICTLY UNHANDLED deduplicated notifications from notification_states only`);
      return notifications;
    } catch (error) {
      console.error('Error loading notifications from notification_states:', error);
      return [];
    }
  };

  // ===== CRITICAL FIX: Force modal display for any unhandled notifications =====
  useEffect(() => {
    // Check for unhandled notifications
    const unhandledNotifications = notificationQueue.filter(n => !n.isHandled && !n.isDismissed);
    
    if (unhandledNotifications.length > 0 && !isNotificationVisible) {
      console.log(`[NotificationContext] 🚨 FORCE SHOWING MODAL for ${unhandledNotifications.length} unhandled notifications from notification_states`);
      
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
          playNotificationSoundMemo(notification.transaction.transaction_type);
        }
      }
    }
  }, [notificationQueue, isNotificationVisible, playNotificationSoundMemo]);

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
            playNotificationSoundMemo(notification.transaction.transaction_type);
          }
        }
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(visibilityCheck);
  }, [isInitialized, notificationQueue, isNotificationVisible, playNotificationSoundMemo]);

  // ===== BELL NOTIFICATION FUNCTIONS =====

  // Use the memoized version created above
  const loadBellNotifications = loadBellNotificationsMemo;

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

  // Use the memoized version created above
  const refreshNotifications = refreshNotificationsMemo;

  // Open notification from bell dropdown - ENHANCED with cross-session check and sound
  const openNotificationFromBell = useCallback(async (notificationId: string) => {
    console.log('[NotificationContext] Opening notification from bell:', notificationId);
    
    // First check if this notification is still unhandled in notification_states
    const { data: dbState, error } = await supabase
      .from('notification_states') // Check notification_states ONLY
      .select('is_handled, is_dismissed, handled_session')
      .eq('id', notificationId)
      .single();
    
    if (error) {
      console.error('[NotificationContext] Error checking notification state in notification_states:', error);
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
        playNotificationSoundMemo(notification.transaction.transaction_type);
      }
      
      // Mark as read in bell
      setReadBellNotifications(prev => new Set([...prev, notificationId]));
    } else {
      console.warn('Notification not found in queue:', notificationId);
      // Refresh notifications and try again
      await refreshNotificationsMemo();
      const updatedQueue = notificationQueue;
      const updatedIndex = updatedQueue.findIndex(n => n.id === notificationId);
      if (updatedIndex !== -1) {
        setCurrentNotificationIndex(updatedIndex);
        setIsNotificationVisible(true);
        setReadBellNotifications(prev => new Set([...prev, notificationId]));
        
        // Play sound
        const notification = updatedQueue[updatedIndex];
        if (notification && notification.transaction) {
          playNotificationSoundMemo(notification.transaction.transaction_type);
        }
      } else {
        alert('This notification is no longer available. It may have been handled on another device.');
      }
    }
  }, [notificationQueue, refreshNotificationsMemo, playNotificationSoundMemo]);

  // FIXED: Mark notification as handled - properly updates database and removes from queue
  const markAsHandledById = async (notificationId: string): Promise<void> => {
    if (!sessionInfo) {
      console.warn('[NotificationContext] No session info available for marking notification as handled');
      return;
    }

    console.log(`[NotificationContext] Marking notification ${notificationId} as HANDLED (permanent) in notification_states`);

    try {
      // Get the notification to find its transaction key
      const notification = notificationQueue.find(n => n.id === notificationId);
      if (notification) {
        const transactionKey = createTransactionKey(notification.transaction.id, notification.eventType);
        
        // Add to handled transactions cache
        handledTransactionsRef.current.add(transactionKey);
        
        // Remove from processing and active tracking
        processingTransactionsRef.current.delete(transactionKey);
        activeTransactionsRef.current.delete(transactionKey);
      }
      
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

      // Update in notification_states with explicit handled status
      const { error } = await supabase
        .from('notification_states') // Update notification_states ONLY
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
        console.error('Error marking notification as handled in notification_states:', error);
        throw error;
      }

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('notification_states')
        .select('is_handled')
        .eq('id', notificationId)
        .single();

      if (verifyError || !verifyData?.is_handled) {
        console.error('Failed to verify notification was marked as handled in notification_states');
        throw new Error('Verification failed');
      }

      console.log(`[NotificationContext] ✅ Successfully marked notification ${notificationId} as HANDLED in notification_states (verified)`);

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
      console.error('Failed to mark notification as handled in notification_states:', error);
      alert('Failed to mark notification as complete. Please try again.');
    }
  };

  // FIXED: Enhanced dismissById function - properly updates database
  const dismissById = async (notificationId: string): Promise<void> => {
    if (!sessionInfo) {
      console.warn('No session info available for dismissing notification');
      return;
    }

    console.log('[NotificationContext] Dismissing notification in notification_states:', notificationId);

    try {
      // Get the notification to find its transaction key
      const notification = notificationQueue.find(n => n.id === notificationId);
      if (notification) {
        const transactionKey = createTransactionKey(notification.transaction.id, notification.eventType);
        
        // Remove from processing and active tracking
        processingTransactionsRef.current.delete(transactionKey);
        activeTransactionsRef.current.delete(transactionKey);
      }
      
      // First update notification_states
      const { error } = await supabase
        .from('notification_states') // Update notification_states ONLY
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
        console.error('Database error dismissing notification in notification_states:', error);
        throw error;
      }

      console.log('[NotificationContext] ✅ Successfully dismissed notification in notification_states:', notificationId);

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
      console.error('Error dismissing notification in notification_states:', error);
      // Show user-friendly error
      alert('Failed to dismiss notification. Please try again.');
    }
  };

  // CRITICAL FIX: Enhanced addNotification with strict deduplication and notification_states only
  const addNotification = async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'isHandled' | 'isDismissed' | 'photos' | 'photosFetched' | 'photoRetryCount'>) => {
    const transactionKey = createTransactionKey(notification.transaction.id, notification.eventType);
    console.log('[NotificationContext] 🚨 addNotification called for:', transactionKey, 'Type:', notification.transaction.transaction_type);
    
    // CRITICAL: Check if this transaction was ever handled
    if (handledTransactionsRef.current.has(transactionKey)) {
      console.log(`[NotificationContext] ⛔ NOT adding notification - transaction was previously handled: ${transactionKey}`);
      return;
    }
    
    // CRITICAL: Check if we're already processing this exact transaction + event
    if (processingTransactionsRef.current.has(transactionKey)) {
      console.log(`[NotificationContext] Already processing transaction: ${transactionKey}`);
      return;
    }
    
    // CRITICAL: Check if we already have this notification in the queue
    const existingNotification = notificationQueueRef.current.find(n => 
      createTransactionKey(n.transaction.id, n.eventType) === transactionKey
    );

    if (existingNotification) {
      console.log(`[NotificationContext] Duplicate notification prevented for: ${transactionKey} (already in queue: ${existingNotification.id})`);
      return;
    }
    
    // CRITICAL: Check if we already have this tracked as active
    if (activeTransactionsRef.current.has(transactionKey)) {
      const existingNotificationId = activeTransactionsRef.current.get(transactionKey);
      console.log(`[NotificationContext] Transaction already active: ${transactionKey} (notification: ${existingNotificationId})`);
      return;
    }
    
    // Mark as processing
    processingTransactionsRef.current.add(transactionKey);
    
    try {
      // CRITICAL: Check if this notification was already handled
      if (isNotificationReallyHandled(transactionKey)) {
        console.log(`[NotificationContext] Skipping already handled notification: ${transactionKey}`);
        return;
      }
      
      // Check notification_states for existing notification
      const { data: existingDb, error: checkError } = await supabase
        .from('notification_states') // Check notification_states ONLY
        .select('*')
        .eq('transaction_id', notification.transaction.id)
        .eq('event_type', notification.eventType)
        .single();
      
      if (!checkError && existingDb) {
        // Now check if the DB notification is handled using its ID
        if (isNotificationReallyHandled(existingDb.id)) {
          console.log(`[NotificationContext] Notification ${existingDb.id} is locally marked as handled/dismissed`);
          handledTransactionsRef.current.add(transactionKey);
          return;
        }
        
        if (existingDb.is_handled || existingDb.is_dismissed) {
          console.log(`[NotificationContext] Notification already ${existingDb.is_handled ? 'handled' : 'dismissed'} in notification_states: ${transactionKey}`);
          handledTransactionsRef.current.add(transactionKey);
          return;
        }
        
        // CRITICAL: If unhandled notification exists in notification_states but not in queue, add it to queue
        console.log(`[NotificationContext] Unhandled notification exists in notification_states, adding to queue: ${transactionKey}`);
        
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
        
        // Create notification from existing notification_states record
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
        
        // Track this transaction as active
        activeTransactionsRef.current.set(transactionKey, existingDb.id);
        
        // Add to queue if not already there
        setNotificationQueue(prev => {
          const updated = [...prev, existingNotification];
          console.log(`[NotificationContext] Added existing notification from notification_states to queue: ${prev.length} -> ${updated.length}`);
          return updated;
        });
        
        // Also refresh bell notifications
        await loadBellNotifications();
        
        // Force show modal immediately
        if (!isNotificationVisibleRef.current) {
          console.log(`[NotificationContext] 🚨 FORCING MODAL for existing ${notification.transaction.transaction_type} notification from notification_states`);
          setTimeout(() => {
            const currentQueue = notificationQueueRef.current;
            const index = currentQueue.findIndex(n => n.id === existingDb.id);
            if (index !== -1) {
              console.log(`[NotificationContext] 🎯 SHOWING MODAL at index ${index}`);
              setCurrentNotificationIndex(index);
              setIsNotificationVisible(true);
              
              // Play notification sound
              playNotificationSoundMemo(notification.transaction.transaction_type);
            }
          }, 100);
        }
        
        return; // Exit here since we've handled the existing notification from notification_states
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

      // Save to notification_states first
      const dbId = await saveNotificationToDB(newNotification);
      if (dbId) {
        newNotification.id = dbId;
        console.log('[NotificationContext] Notification saved to notification_states with ID:', dbId);
        
        // Track this transaction as active
        activeTransactionsRef.current.set(transactionKey, dbId);
      } else {
        console.warn('[NotificationContext] Failed to save to notification_states, using temporary ID');
        // Still track with temp ID
        activeTransactionsRef.current.set(transactionKey, newNotification.id);
      }

      console.log('[NotificationContext] 🚀 Adding notification to queue from notification_states:', {
        id: newNotification.id,
        transactionId: newNotification.transaction.id,
        transactionKey: transactionKey,
        transactionType: newNotification.transaction.transaction_type,
        photoCount: newNotification.photos.length,
        eventType: newNotification.eventType
      });

      // Add to queue
      setNotificationQueue(prev => {
        const updated = [...prev, newNotification];
        console.log(`[NotificationContext] Queue updated with notification from notification_states: ${prev.length} -> ${updated.length} notifications`);
        return updated;
      });
      
      // Also refresh bell notifications
      await loadBellNotifications();
      
      // FORCE immediate modal display for new notifications
      if (!isNotificationVisibleRef.current) {
        console.log('[NotificationContext] 🎯 FORCING immediate modal display for new notification from notification_states');
        
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
            playNotificationSoundMemo('Sale');
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
              playNotificationSoundMemo('Purchase');
              
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
        console.log('[NotificationContext] Modal already visible, notification added to queue from notification_states');
        // Still play sound for queued notification
        playNotificationSoundMemo(notification.transaction.transaction_type);
      }
      
    } finally {
      // Remove from processing after a delay to prevent rapid duplicates
      // Keep it longer to prevent duplicates
      const delay = 5000; // 5 seconds for all types
      setTimeout(() => {
        processingTransactionsRef.current.delete(transactionKey);
      }, delay);
    }
  };

  // ===== NAVIGATION AND CONTROL FUNCTIONS =====

  // FIXED: Enhanced mark current as handled - properly navigates after handling
  const markCurrentAsHandled = async () => {
    const currentNotification = notificationQueue[currentNotificationIndex];
    if (!currentNotification) return;
    
    console.log('[NotificationContext] Marking current notification as PERMANENTLY handled in notification_states');
    
    // Use the enhanced markAsHandledById which now permanently handles notifications in notification_states
    await markAsHandledById(currentNotification.id);
    
    // After marking as handled, navigate to next unhandled notification
    // Note: The notification has already been removed from the queue by markAsHandledById
    const updatedQueue = notificationQueueRef.current; // Get the updated queue
    const remainingUnhandled = updatedQueue.filter(n => !n.isHandled && !n.isDismissed);
    
    if (remainingUnhandled.length === 0) {
      console.log('[NotificationContext] All notifications handled, closing panel');
      setIsNotificationVisible(false);
      setCurrentNotificationIndex(0);
      
      // Clear tracking refs
      activeTransactionsRef.current.clear();
      processingTransactionsRef.current.clear();
    } else {
      // Find the first unhandled notification
      const firstUnhandledIndex = updatedQueue.findIndex(n => !n.isHandled && !n.isDismissed);
      
      if (firstUnhandledIndex !== -1) {
        console.log(`[NotificationContext] Moving to next unhandled notification at index ${firstUnhandledIndex}`);
        setCurrentNotificationIndex(firstUnhandledIndex);
        
        // Play sound for next notification
        const nextNotification = updatedQueue[firstUnhandledIndex];
        if (nextNotification && nextNotification.transaction) {
          playNotificationSoundMemo(nextNotification.transaction.transaction_type);
        }
      } else {
        // Shouldn't reach here, but handle it anyway
        console.log('[NotificationContext] No more unhandled notifications, closing panel');
        setIsNotificationVisible(false);
        setCurrentNotificationIndex(0);
      }
    }
  };

  // FIXED: Enhanced dismiss current notification - properly navigates after dismissing
  const dismissCurrentNotification = () => {
    const currentNotification = notificationQueue[currentNotificationIndex];
    if (!currentNotification) return;

    console.log('[NotificationContext] Dismissing current notification in notification_states:', currentNotification.id);
    
    // Dismiss in notification_states first, then update UI
    dismissById(currentNotification.id).then(() => {
      // After dismissing, navigate to next unhandled notification
      const updatedQueue = notificationQueueRef.current; // Get the updated queue
      const remainingUnhandled = updatedQueue.filter(n => !n.isHandled && !n.isDismissed);
      
      if (remainingUnhandled.length === 0) {
        console.log('[NotificationContext] No remaining notifications after dismiss');
        setIsNotificationVisible(false);
        setNotificationQueue([]);
        setCurrentNotificationIndex(0);
        
        // Clear tracking refs
        activeTransactionsRef.current.clear();
        processingTransactionsRef.current.clear();
      } else {
        // Find the first unhandled notification
        const firstUnhandledIndex = updatedQueue.findIndex(n => !n.isHandled && !n.isDismissed);
        
        if (firstUnhandledIndex !== -1) {
          console.log(`[NotificationContext] Moving to next unhandled notification at index ${firstUnhandledIndex}`);
          setCurrentNotificationIndex(firstUnhandledIndex);
          
          // Keep modal visible
          if (!isNotificationVisible) {
            setIsNotificationVisible(true);
          }
          
          // Play sound for next notification
          const nextNotification = updatedQueue[firstUnhandledIndex];
          if (nextNotification && nextNotification.transaction) {
            playNotificationSoundMemo(nextNotification.transaction.transaction_type);
          }
        } else {
          // Shouldn't reach here, but handle it anyway
          console.log('[NotificationContext] No more unhandled notifications, closing panel');
          setIsNotificationVisible(false);
          setNotificationQueue([]);
          setCurrentNotificationIndex(0);
        }
      }
    }).catch(error => {
      console.error('Failed to dismiss notification in notification_states:', error);
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
        playNotificationSoundMemo(nextNotification.transaction.transaction_type);
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
        playNotificationSoundMemo(prevNotification.transaction.transaction_type);
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

  // Load handled transactions on initialization
  useEffect(() => {
    const loadHandledTransactions = async () => {
      try {
        const { data: auditLogs, error } = await supabase
          .from('notification_audit_log')
          .select('new_state')
          .eq('action', 'HANDLED')
          .limit(5000);

        if (!error && auditLogs) {
          auditLogs.forEach(log => {
            if (log.new_state && 
                log.new_state.transaction_id && 
                log.new_state.event_type &&
                log.new_state.is_handled === true) {
              const key = createTransactionKey(log.new_state.transaction_id, log.new_state.event_type);
              handledTransactionsRef.current.add(key);
            }
          });
          console.log(`[NotificationContext] Loaded ${handledTransactionsRef.current.size} handled transactions from audit log`);
        }
      } catch (error) {
        console.error('Error loading handled transactions:', error);
      }
    };

    loadHandledTransactions();
  }, []);

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
      console.log('[NotificationContext] Initializing notification provider with STRICT notification_states recovery (NO handled recovery)...');
      
      const session = await initializeSession();
      
      // CRITICAL FIX: Run comprehensive refresh with NEW transactions check (NOT audit log recovery)
      await refreshNotificationsMemo();
      
      // After refresh, check if we have unhandled notifications that need display
      setTimeout(() => {
        const unhandled = notificationQueueRef.current.filter(n => !n.isHandled && !n.isDismissed);
        if (unhandled.length > 0 && !isNotificationVisibleRef.current) {
          console.log(`[NotificationContext] Post-init: Force showing modal for ${unhandled.length} strictly unhandled notifications from notification_states`);
          setCurrentNotificationIndex(0);
          setIsNotificationVisible(true);
          // Play sound for first notification
          if (unhandled[0] && unhandled[0].transaction) {
            playNotificationSoundMemo(unhandled[0].transaction.transaction_type);
          }
        }
      }, 500);
      
      setIsInitialized(true);
      console.log('[NotificationContext] Notification provider initialized with strict notification_states-only recovery');
    };

    initializeProvider();
  }, [initializeSession, refreshNotificationsMemo, playNotificationSoundMemo]);

  // CRITICAL FIX: Real-time subscriptions with immediate modal trigger and strict deduplication
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

    console.log('[NotificationContext] Setting up real-time subscriptions with STRICT DEDUPLICATION and notification_states persistence...');
    
    const channels: any[] = [];
    
    // CRITICAL FIX: Enhanced notification handler with strict deduplication - use stable references
    const handleTransactionNotification = async (
      payload: any,
      transactionType: 'Purchase' | 'Sale',
      validator: (data: any) => boolean,
      converter: (data: any) => Transaction
    ) => {
      const transactionData = payload.eventType === 'DELETE' ? payload.old : payload.new;
      const transactionId = transactionData?.id;
      const transactionKey = createTransactionKey(transactionId, payload.eventType);

      console.log(`[NotificationContext] 🚨 REAL-TIME ${transactionType} event:`, {
        eventType: payload.eventType,
        transactionId: transactionId,
        transactionKey: transactionKey,
        timestamp: new Date().toISOString()
      });

      // CRITICAL: Check if this transaction was ever handled
      if (handledTransactionsRef.current.has(transactionKey)) {
        console.log(`[NotificationContext] ⛔ Ignoring real-time event - transaction was previously handled: ${transactionKey}`);
        return;
      }

      // CRITICAL: Multiple deduplication checks
      // 1. Check if already processing
      if (processingTransactionsRef.current.has(transactionKey)) {
        console.log(`[NotificationContext] Already processing: ${transactionKey}`);
        return;
      }
      
      // 2. Check if already in queue
      const existingInQueue = notificationQueueRef.current.find(n => 
        createTransactionKey(n.transaction.id, n.eventType) === transactionKey
      );

      if (existingInQueue) {
        console.log(`[NotificationContext] Already in queue: ${transactionKey} (${existingInQueue.id})`);
        return;
      }
      
      // 3. Check if already tracked as active
      if (activeTransactionsRef.current.has(transactionKey)) {
        const existingNotificationId = activeTransactionsRef.current.get(transactionKey);
        console.log(`[NotificationContext] Already tracked as active: ${transactionKey} (${existingNotificationId})`);
        return;
      }

      // 4. Check if already handled
      if (isNotificationReallyHandled(transactionKey)) {
        console.log(`[NotificationContext] Already handled: ${transactionKey}`);
        return;
      }
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        if (!validator(transactionData)) {
          console.warn(`[NotificationContext] Invalid ${transactionType} data:`, transactionData);
          return;
        }
        
        const transaction = converter(transactionData);
        console.log(`[NotificationContext] 🚀 Processing REAL-TIME ${transactionType} for notification_states:`, transaction.id);
        
        try {
          // CRITICAL: Double-check against audit log for real-time events
          const wasHandled = await wasTransactionEverHandled(
            transaction.id, 
            transactionType === 'Purchase' ? 'transactions' : 'sales_transactions',
            payload.eventType
          );
          
          if (wasHandled) {
            console.log(`[NotificationContext] ⛔ Real-time event for previously handled transaction: ${transaction.id}`);
            return;
          }
          
          // CRITICAL FIX: Only wait for photos on Purchase INSERT events
          if (payload.eventType === 'INSERT' && transactionType === 'Purchase') {
            console.log('[NotificationContext] Waiting 2 seconds for photos on purchase...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else if (transactionType === 'Sale') {
            // For sales, ensure immediate processing
            console.log('[NotificationContext] Processing sale immediately - no photo wait needed, will save to notification_states');
          }
          
          // Add notification - this will save to notification_states
          await addNotification({
            transaction,
            suppliers,
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            priorityLevel: payload.eventType === 'INSERT' ? 'HIGH' : 'MEDIUM',
            requiresAction: payload.eventType === 'INSERT'
          });
          
          console.log(`[NotificationContext] ✅ Real-time ${transactionType} notification processed successfully and saved to notification_states`);
          
        } catch (error) {
          console.error(`[NotificationContext] Error processing real-time notification for notification_states:`, error);
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
        console.log('[NotificationContext] Purchase subscription status (saves to notification_states):', status);
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
        console.log('[NotificationContext] Sales subscription status (saves to notification_states):', status);
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
          console.log('[NotificationContext] New photo uploaded for notification_states notifications:', rawPhotoData.transaction_id, rawPhotoData.file_name);
          
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
                console.log(`[NotificationContext] Updating notification from notification_states with new photo for transaction: ${photoData.transaction_id}`);
                
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

    // Notification states subscription - ENHANCED for cross-session sync - CRITICAL: notification_states ONLY
    const notificationStatesChannel = supabase
      .channel('notification-states-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_states' // ONLY notification_states, NEVER notification_audit_log
        },
        (payload) => {
          const updatedState = payload.new;
          console.log('[NotificationContext] Notification state updated in notification_states:', {
            id: updatedState.id,
            is_handled: updatedState.is_handled,
            is_dismissed: updatedState.is_dismissed,
            by_session: updatedState.handled_session,
            current_session: sessionInfo?.sessionId
          });
          
          // Process updates from ALL sessions (including other devices/browsers)
          if (updatedState.is_handled || updatedState.is_dismissed) {
            // Track as handled
            const transactionKey = createTransactionKey(updatedState.transaction_id, updatedState.event_type);
            handledTransactionsRef.current.add(transactionKey);
            
            // Check if this was handled by another session
            const isFromAnotherSession = updatedState.handled_session !== sessionInfo?.sessionId;
            
            if (isFromAnotherSession) {
              console.log(`[NotificationContext] Notification ${updatedState.id} was ${updatedState.is_handled ? 'handled' : 'dismissed'} by another session in notification_states`);
              
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
              console.log(`[NotificationContext] Removed notification from queue (notification_states update): ${prev.length} -> ${filtered.length}`);
              
              // Remove from tracking
              const removedNotification = prev.find(n => n.id === updatedState.id);
              if (removedNotification) {
                const transactionKey = createTransactionKey(removedNotification.transaction.id, removedNotification.eventType);
                activeTransactionsRef.current.delete(transactionKey);
                processingTransactionsRef.current.delete(transactionKey);
              }
              
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
          table: 'notification_states' // ONLY notification_states, NEVER notification_audit_log
        },
        (payload) => {
          const deletedState = payload.old;
          console.log('[NotificationContext] Notification state deleted from notification_states:', deletedState.id);
          
          // Track as handled
          const transactionKey = createTransactionKey(deletedState.transaction_id, deletedState.event_type);
          handledTransactionsRef.current.add(transactionKey);
          
          // Remove from both queues when deleted
          setNotificationQueue(prev => {
            const filtered = prev.filter(n => n.id !== deletedState.id);
            
            // Remove from tracking
            const removedNotification = prev.find(n => n.id === deletedState.id);
            if (removedNotification) {
              const transactionKey = createTransactionKey(removedNotification.transaction.id, removedNotification.eventType);
              activeTransactionsRef.current.delete(transactionKey);
              processingTransactionsRef.current.delete(transactionKey);
            }
            
            // Handle current notification being deleted
            const currentNotification = prev[currentNotificationIndex];
            if (currentNotification?.id === deletedState.id) {
              console.log('[NotificationContext] Current notification was deleted from notification_states, navigating...');
              
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
        console.log('[NotificationContext] Notification states subscription status (notification_states only):', status);
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

    // CRITICAL: Only depend on stable values that should trigger subscription recreation
  }, [isInitialized, sessionInfo?.sessionId, wasTransactionEverHandled]); // FIXED: Added wasTransactionEverHandled dependency

  // Session heartbeat
  useEffect(() => {
    if (!sessionInfo) return;

    const heartbeatInterval = setInterval(updateSessionHeartbeat, 30000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionInfo, updateSessionHeartbeat]);

  // Periodic sync check for cross-session updates - NEW - CRITICAL: notification_states ONLY
  useEffect(() => {
    if (!sessionInfo || !isInitialized) return;

    // Check for handled notifications from other sessions every 10 seconds
    const syncInterval = setInterval(async () => {
      try {
        // Get IDs of current notifications
        const currentIds = notificationQueue.map(n => n.id);
        
        if (currentIds.length === 0) return;
        
        // Check their status in notification_states database
        const { data: dbStates, error } = await supabase
          .from('notification_states') // ONLY notification_states, NEVER notification_audit_log
          .select('id, is_handled, is_dismissed, handled_session, transaction_id, event_type')
          .in('id', currentIds);
        
        if (error) {
          console.error('[NotificationContext] Error checking notification states in notification_states:', error);
          return;
        }
        
        // Find notifications that were handled/dismissed by other sessions
        const toRemove: string[] = [];
        
        dbStates?.forEach(dbState => {
          if ((dbState.is_handled || dbState.is_dismissed)) {
            // Track as handled
            const transactionKey = createTransactionKey(dbState.transaction_id, dbState.event_type);
            handledTransactionsRef.current.add(transactionKey);
            
            if (dbState.handled_session !== sessionInfo.sessionId) {
              toRemove.push(dbState.id);
              console.log(`[NotificationContext] Sync check: Found notification ${dbState.id} ${dbState.is_handled ? 'handled' : 'dismissed'} by another session in notification_states`);
              
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
          }
        });
        
        // Remove handled/dismissed notifications
        if (toRemove.length > 0) {
          setNotificationQueue(prev => {
            const filtered = prev.filter(n => !toRemove.includes(n.id));
            console.log(`[NotificationContext] Sync check: Removing ${toRemove.length} notifications handled elsewhere in notification_states`);
            
            // Clean up tracking for removed notifications
            prev.forEach(notification => {
              if (toRemove.includes(notification.id)) {
                const transactionKey = createTransactionKey(notification.transaction.id, notification.eventType);
                activeTransactionsRef.current.delete(transactionKey);
                processingTransactionsRef.current.delete(transactionKey);
              }
            });
            
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
        console.error('[NotificationContext] Error in periodic sync with notification_states:', error);
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