// src/services/notificationPersistenceService.ts - FIXED: Never recover old/handled transactions
import { supabase } from '../lib/supabase';

export interface NotificationCleanupOptions {
  maxAge?: number;
  includeHandled?: boolean;
  includeDismissed?: boolean;
  batchSize?: number;
}

export interface NotificationStats {
  total: number;
  handled: number;
  dismissed: number;
  pending: number;
  expired: number;
}

export interface OrphanedTransactionStats {
  totalTransactions: number;
  existingNotifications: number;
  orphanedPurchases: number;
  orphanedSales: number;
  notificationsCreated: number;
}

export class NotificationPersistenceService {
  
  static async cleanupNotifications(options: NotificationCleanupOptions = {}): Promise<number> {
    const {
      maxAge = 24,
      includeHandled = true,
      includeDismissed = true,
      batchSize = 100
    } = options;

    try {
      const cutoffTime = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('notification_states')
        .delete()
        .lt('created_at', cutoffTime);

      if (includeHandled && includeDismissed) {
        query = query.or('is_handled.eq.true,is_dismissed.eq.true');
      } else if (includeHandled) {
        query = query.eq('is_handled', true);
      } else if (includeDismissed) {
        query = query.eq('is_dismissed', true);
      }

      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error cleaning up notifications:', error);
        return 0;
      }

      console.log(`[PersistenceService] Cleaned up ${count || 0} old notifications`);
      return count || 0;
    } catch (error) {
      console.error('Error in notification cleanup:', error);
      return 0;
    }
  }

  static async expireNotifications(): Promise<number> {
    try {
      const now = new Date().toISOString();
      
      const { data, error, count } = await supabase
        .from('notification_states')
        .update({ 
          is_dismissed: true,
          handled_at: now,
          handled_by: 'system-auto-expire'
        })
        .lt('expires_at', now)
        .eq('is_dismissed', false)
        .eq('is_handled', false);

      if (error) {
        console.error('Error expiring notifications:', error);
        return 0;
      }

      console.log(`[PersistenceService] Auto-expired ${count || 0} notifications`);
      return count || 0;
    } catch (error) {
      console.error('Error in notification expiry:', error);
      return 0;
    }
  }

  /**
   * CRITICAL FIX: Only recover RECENT transactions that were NEVER handled
   * NEVER recover old transactions from weeks/months ago
   */
  static async recoverOrphanedTransactions(): Promise<OrphanedTransactionStats> {
    try {
      console.log('[PersistenceService] 🔍 Starting SAFE orphaned transaction recovery (recent only)...');
      
      // CRITICAL: Only check transactions from the last 2 hours (not weeks/months!)
      const recentCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      // Step 1: Get handled notification IDs from audit log to prevent recovery
      const { data: handledLogs, error: auditError } = await supabase
        .from('notification_audit_log')
        .select('notification_id, new_state')
        .or('action.eq.HANDLED,action.eq.DISMISSED');
      
      const handledTransactionKeys = new Set<string>();
      if (!auditError && handledLogs) {
        handledLogs.forEach(log => {
          if (log.new_state && log.new_state.transaction_id && log.new_state.transaction_table) {
            const key = `${log.new_state.transaction_table}-${log.new_state.transaction_id}-INSERT`;
            handledTransactionKeys.add(key);
          }
        });
        console.log(`[PersistenceService] Found ${handledTransactionKeys.size} previously handled transactions to skip`);
      }

      // Step 2: Get existing notifications
      const { data: existingNotifications, error: existingError } = await supabase
        .from('notification_states')
        .select('transaction_id, transaction_table, event_type');

      if (existingError) {
        console.error('Error fetching existing notifications:', existingError);
        throw existingError;
      }

      const existingNotificationKeys = new Set(
        (existingNotifications || []).map(n => 
          `${n.transaction_table}-${n.transaction_id}-${n.event_type}`
        )
      );

      console.log(`[PersistenceService] Found ${existingNotificationKeys.size} existing notifications`);

      // Step 3: ONLY get RECENT purchase transactions
      const { data: purchaseTransactions, error: purchaseError } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', recentCutoff)  // CRITICAL: Only recent transactions
        .order('created_at', { ascending: false })
        .limit(50); // Reasonable limit

      if (purchaseError) {
        console.error('Error fetching purchase transactions:', purchaseError);
        throw purchaseError;
      }

      // Step 4: ONLY get RECENT sales transactions
      const { data: salesTransactions, error: salesError } = await supabase
        .from('sales_transactions')
        .select('*')
        .gte('created_at', recentCutoff)  // CRITICAL: Only recent transactions
        .order('created_at', { ascending: false })
        .limit(50); // Reasonable limit

      if (salesError) {
        console.error('Error fetching sales transactions:', salesError);
        throw salesError;
      }

      console.log(`[PersistenceService] Found ${purchaseTransactions?.length || 0} recent purchases, ${salesTransactions?.length || 0} recent sales (last 2 hours only)`);

      const stats: OrphanedTransactionStats = {
        totalTransactions: (purchaseTransactions?.length || 0) + (salesTransactions?.length || 0),
        existingNotifications: existingNotifications?.length || 0,
        orphanedPurchases: 0,
        orphanedSales: 0,
        notificationsCreated: 0
      };

      const notificationsToCreate: any[] = [];

      // Step 5: Check purchase transactions - STRICT filtering
      for (const tx of purchaseTransactions || []) {
        const notificationKey = `transactions-${tx.id}-INSERT`;
        
        // CRITICAL: Skip if already handled in audit log
        if (handledTransactionKeys.has(notificationKey)) {
          console.log(`[PersistenceService] ⛔ Skipping ${tx.id} - was previously handled`);
          continue;
        }
        
        // CRITICAL: Skip if notification exists
        if (existingNotificationKeys.has(notificationKey)) {
          continue;
        }
        
        // CRITICAL: Skip if too old (double check)
        const txAge = Date.now() - new Date(tx.created_at).getTime();
        if (txAge > 2 * 60 * 60 * 1000) {
          console.log(`[PersistenceService] ⛔ Skipping ${tx.id} - too old (${(txAge / (60 * 60 * 1000)).toFixed(1)} hours)`);
          continue;
        }
        
        console.log(`[PersistenceService] ✓ Found RECENT orphaned purchase: ${tx.id} (${tx.transaction_number})`);
        
        const unifiedTransaction = {
          id: tx.id,
          transaction_type: 'Purchase',
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

        const transactionTime = new Date(tx.created_at).getTime();
        const expiresAt = new Date(transactionTime + 24 * 60 * 60 * 1000).toISOString();
        
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
        
        stats.orphanedPurchases++;
      }

      // Step 6: Check sales transactions - STRICT filtering
      for (const tx of salesTransactions || []) {
        const notificationKey = `sales_transactions-${tx.id}-INSERT`;
        
        // CRITICAL: Skip if already handled
        if (handledTransactionKeys.has(notificationKey)) {
          console.log(`[PersistenceService] ⛔ Skipping sales ${tx.id} - was previously handled`);
          continue;
        }
        
        // CRITICAL: Skip if notification exists
        if (existingNotificationKeys.has(notificationKey)) {
          continue;
        }
        
        // CRITICAL: Skip if too old
        const txAge = Date.now() - new Date(tx.created_at).getTime();
        if (txAge > 2 * 60 * 60 * 1000) {
          console.log(`[PersistenceService] ⛔ Skipping sales ${tx.id} - too old`);
          continue;
        }
        
        console.log(`[PersistenceService] ✓ Found RECENT orphaned sale: ${tx.id}`);
        
        const unifiedTransaction = {
          id: tx.id,
          transaction_type: 'Sale',
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

        const transactionTime = new Date(tx.created_at).getTime();
        const expiresAt = new Date(transactionTime + 24 * 60 * 60 * 1000).toISOString();
        
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
        
        stats.orphanedSales++;
      }

      // Step 7: Create notifications ONLY if found RECENT orphaned transactions
      if (notificationsToCreate.length > 0) {
        console.log(`[PersistenceService] 🚀 Creating ${notificationsToCreate.length} notifications for RECENT orphaned transactions...`);
        
        const { data: createdNotifications, error: createError } = await supabase
          .from('notification_states')
          .insert(notificationsToCreate)
          .select();

        if (createError) {
          console.error('Error creating orphaned transaction notifications:', createError);
          // Don't throw - just log and continue
          return stats;
        }

        stats.notificationsCreated = createdNotifications?.length || 0;
        console.log(`[PersistenceService] ✅ Successfully created ${stats.notificationsCreated} notifications for RECENT orphaned transactions`);
      } else {
        console.log(`[PersistenceService] ✓ No recent orphaned transactions found`);
      }

      console.log(`[PersistenceService] 🔍 Safe orphaned recovery completed:`, stats);
      return stats;
      
    } catch (error) {
      console.error('[PersistenceService] Error in orphaned transaction recovery:', error);
      return {
        totalTransactions: 0,
        existingNotifications: 0,
        orphanedPurchases: 0,
        orphanedSales: 0,
        notificationsCreated: 0
      };
    }
  }

  static async getNotificationStats(): Promise<NotificationStats> {
    try {
      const { data, error } = await supabase
        .from('notification_states')
        .select('is_handled, is_dismissed, expires_at');

      if (error) {
        console.error('Error fetching notification stats:', error);
        return { total: 0, handled: 0, dismissed: 0, pending: 0, expired: 0 };
      }

      const now = new Date();
      const stats = data.reduce((acc, notification) => {
        acc.total++;
        
        if (notification.is_handled) {
          acc.handled++;
        } else if (notification.is_dismissed) {
          acc.dismissed++;
        } else {
          acc.pending++;
        }

        if (notification.expires_at && new Date(notification.expires_at) < now) {
          acc.expired++;
        }

        return acc;
      }, { total: 0, handled: 0, dismissed: 0, pending: 0, expired: 0 });

      return stats;
    } catch (error) {
      console.error('Error calculating notification stats:', error);
      return { total: 0, handled: 0, dismissed: 0, pending: 0, expired: 0 };
    }
  }

  static async bulkUpdateNotifications(
    notificationIds: string[], 
    updates: { is_handled?: boolean; is_dismissed?: boolean; handled_by?: string }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_states')
        .update({
          ...updates,
          handled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', notificationIds);

      if (error) {
        console.error('Error bulk updating notifications:', error);
        return false;
      }

      console.log(`[PersistenceService] Bulk updated ${notificationIds.length} notifications`);
      return true;
    } catch (error) {
      console.error('Error in bulk notification update:', error);
      return false;
    }
  }

  static async getNotificationsForUser(userIdentifier: string, includeHandled = false): Promise<any[]> {
    try {
      let query = supabase
        .from('notification_states')
        .select('*')
        .order('created_at', { ascending: true });

      if (!includeHandled) {
        query = query.eq('is_handled', false).eq('is_dismissed', false);
      } else {
        console.warn('[PersistenceService] ⚠️ Including handled notifications - admin/debug only');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user notifications:', error);
        return [];
      }

      const filteredData = includeHandled ? data : (data || []).filter(n => {
        if (n.is_handled === true || n.is_dismissed === true) {
          console.warn(`[PersistenceService] 🚨 Filtered out handled/dismissed notification ${n.id}`);
          return false;
        }
        return true;
      });
      
      console.log(`[PersistenceService] Retrieved ${filteredData?.length || 0} notifications`);
      return filteredData || [];
    } catch (error) {
      console.error('Error in getNotificationsForUser:', error);
      return [];
    }
  }

  static async cleanupInactiveSessions(maxAgeHours = 168): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
      
      const { data, error, count } = await supabase
        .from('user_sessions')
        .delete()
        .or(`is_active.eq.false,last_seen.lt.${cutoffTime}`);

      if (error) {
        console.error('Error cleaning up sessions:', error);
        return 0;
      }

      console.log(`[PersistenceService] Cleaned up ${count || 0} inactive sessions`);
      return count || 0;
    } catch (error) {
      console.error('Error in session cleanup:', error);
      return 0;
    }
  }

  /**
   * CRITICAL FIX: Reduced frequency and made safer - only recovers RECENT orphaned
   */
  static startPeriodicCleanup(intervalMinutes = 60): () => void {
    const cleanup = async () => {
      console.log('[PersistenceService] 🔄 Running SAFE periodic cleanup...');
      
      try {
        // Step 1: SAFE orphaned recovery (recent only)
        const orphanedStats = await this.recoverOrphanedTransactions();
        if (orphanedStats.notificationsCreated > 0) {
          console.log(`[PersistenceService] ✅ Recovered ${orphanedStats.notificationsCreated} RECENT orphaned`);
        }
        
        // Step 2: Expire old notifications
        await this.expireNotifications();
        
        // Step 3: Clean up handled/dismissed
        await this.cleanupNotifications({ maxAge: 24, includeHandled: true, includeDismissed: true });
        
        // Step 4: Clean up inactive sessions
        await this.cleanupInactiveSessions(168);
        
        // Step 5: Permanently delete old handled notifications
        await this.permanentlyDeleteHandledNotifications(1);
        
        // Step 6: Log stats
        const stats = await this.getNotificationStats();
        console.log('[PersistenceService] 📊 Stats:', stats);
        
      } catch (error) {
        console.error('[PersistenceService] Error in cleanup:', error);
      }
    };

    cleanup();
    const intervalId = setInterval(cleanup, intervalMinutes * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      console.log('[PersistenceService] Periodic cleanup stopped');
    };
  }

  static generateDeviceIdentifier(): string {
    const stored = localStorage.getItem('device_identifier');
    if (stored) return stored;

    const identifier = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      Math.random().toString(36)
    ].join('|');

    const hash = btoa(identifier).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    const deviceId = `device_${hash}_${Date.now()}`;

    localStorage.setItem('device_identifier', deviceId);
    return deviceId;
  }

  static async emergencyRecovery(): Promise<any[]> {
    try {
      console.log('[PersistenceService] 🚨 Emergency recovery - UNHANDLED ONLY...');
      
      // Only recover recent orphaned
      const orphanedStats = await this.recoverOrphanedTransactions();
      
      // Get unhandled from last 48 hours only
      const { data, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_handled', false)
        .eq('is_dismissed', false)
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error in emergency recovery:', error);
        return [];
      }

      const unhandledOnly = (data || []).filter(n => {
        if (n.is_handled === true || n.is_dismissed === true) {
          console.error(`[PersistenceService] 🚨 Filtered out handled ${n.id}`);
          return false;
        }
        
        const handledKeys = [`handled_${n.id}`, `dismissed_${n.id}`];
        for (const key of handledKeys) {
          if (localStorage.getItem(key)) {
            return false;
          }
        }
        
        return true;
      });

      console.log(`[PersistenceService] Emergency: ${unhandledOnly.length} unhandled recovered`);
      return unhandledOnly;
    } catch (error) {
      console.error('Error in emergency recovery:', error);
      return [];
    }
  }

  static async permanentlyDeleteHandledNotifications(maxAgeHours = 1): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
      
      const { data, error, count } = await supabase
        .from('notification_states')
        .delete()
        .eq('is_handled', true)
        .lt('handled_at', cutoffTime);

      if (error) {
        console.error('Error permanently deleting handled:', error);
        return 0;
      }

      if (count && count > 0) {
        console.log(`[PersistenceService] ♻️ Deleted ${count} old handled`);
      }

      return count || 0;
    } catch (error) {
      console.error('Error in permanentlyDeleteHandledNotifications:', error);
      return 0;
    }
  }

  static async isNotificationHandled(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('notification_states')
        .select('is_handled')
        .eq('id', notificationId)
        .single();

      if (error) return false;
      return data?.is_handled === true;
    } catch (error) {
      return false;
    }
  }

  static async getPendingNotifications(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_handled', false)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: true });

      if (error) return [];

      const trulyPending = (data || []).filter(n => {
        if (n.is_handled === true || n.is_dismissed === true) {
          console.warn(`[PersistenceService] 🚨 Filtered ${n.id} from pending`);
          return false;
        }
        return true;
      });

      console.log(`[PersistenceService] ${trulyPending.length} truly pending`);
      return trulyPending;
    } catch (error) {
      return [];
    }
  }

  static async performHealthCheck(): Promise<{
    notifications: NotificationStats;
    orphaned: OrphanedTransactionStats;
    recommendations: string[];
  }> {
    try {
      console.log('[PersistenceService] 🏥 Health check...');
      
      const notifications = await this.getNotificationStats();
      const orphaned = await this.recoverOrphanedTransactions();
      
      const recommendations: string[] = [];
      
      if (orphaned.orphanedPurchases > 0 || orphaned.orphanedSales > 0) {
        recommendations.push(`Found ${orphaned.orphanedPurchases + orphaned.orphanedSales} recent orphaned - notifications created`);
      }
      
      if (notifications.pending > 50) {
        recommendations.push(`High pending count (${notifications.pending})`);
      }
      
      if (notifications.handled > 1000) {
        recommendations.push(`Large handled count (${notifications.handled}) - cleanup recommended`);
      }
      
      if (notifications.expired > 0) {
        recommendations.push(`${notifications.expired} expired - running auto-expiry`);
        await this.expireNotifications();
      }
      
      return { notifications, orphaned, recommendations };
    } catch (error) {
      return {
        notifications: { total: 0, handled: 0, dismissed: 0, pending: 0, expired: 0 },
        orphaned: { totalTransactions: 0, existingNotifications: 0, orphanedPurchases: 0, orphanedSales: 0, notificationsCreated: 0 },
        recommendations: ['Health check failed']
      };
    }
  }
}

export const useNotificationPersistence = () => {
  return {
    cleanupNotifications: NotificationPersistenceService.cleanupNotifications,
    expireNotifications: NotificationPersistenceService.expireNotifications,
    recoverOrphanedTransactions: NotificationPersistenceService.recoverOrphanedTransactions,
    getNotificationStats: NotificationPersistenceService.getNotificationStats,
    bulkUpdateNotifications: NotificationPersistenceService.bulkUpdateNotifications,
    getNotificationsForUser: NotificationPersistenceService.getNotificationsForUser,
    cleanupInactiveSessions: NotificationPersistenceService.cleanupInactiveSessions,
    emergencyRecovery: NotificationPersistenceService.emergencyRecovery,
    permanentlyDeleteHandledNotifications: NotificationPersistenceService.permanentlyDeleteHandledNotifications,
    isNotificationHandled: NotificationPersistenceService.isNotificationHandled,
    getPendingNotifications: NotificationPersistenceService.getPendingNotifications,
    performHealthCheck: NotificationPersistenceService.performHealthCheck
  };
};