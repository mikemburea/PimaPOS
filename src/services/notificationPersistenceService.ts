// src/services/notificationPersistenceService.ts - UPDATED: Complete orphaned transaction recovery
import { supabase } from '../lib/supabase';

export interface NotificationCleanupOptions {
  maxAge?: number; // Hours
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
  
  /**
   * ENHANCED: Clean up old notifications with aggressive handling of handled notifications
   */
  static async cleanupNotifications(options: NotificationCleanupOptions = {}): Promise<number> {
    const {
      maxAge = 24, // Default 24 hours
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

      // Add conditions based on options
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

  /**
   * Force expire notifications that have passed their expiry time
   */
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
        .eq('is_handled', false); // Only expire unhandled notifications

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
   * NEW: Comprehensive orphaned transaction recovery
   * Finds transactions that exist but don't have corresponding notifications
   */
  static async recoverOrphanedTransactions(): Promise<OrphanedTransactionStats> {
    try {
      console.log('[PersistenceService] 🔍 Starting comprehensive orphaned transaction recovery...');
      
      // Step 1: Get all existing notifications to avoid duplicates
      const { data: existingNotifications, error: existingError } = await supabase
        .from('notification_states')
        .select('transaction_id, transaction_table, event_type');

      if (existingError) {
        console.error('Error fetching existing notifications:', existingError);
        throw existingError;
      }

      // Create lookup set for existing notifications
      const existingNotificationKeys = new Set(
        (existingNotifications || []).map(n => 
          `${n.transaction_table}-${n.transaction_id}-${n.event_type}`
        )
      );

      console.log(`[PersistenceService] Found ${existingNotificationKeys.size} existing notifications`);

      // Step 2: Get all purchase transactions
      const { data: purchaseTransactions, error: purchaseError } = await supabase
        .from('transactions')
        .select(`
          *,
          suppliers:supplier_id (
            name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (purchaseError) {
        console.error('Error fetching purchase transactions:', purchaseError);
        throw purchaseError;
      }

      // Step 3: Get all sales transactions
      const { data: salesTransactions, error: salesError } = await supabase
        .from('sales_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error fetching sales transactions:', salesError);
        throw salesError;
      }

      const stats: OrphanedTransactionStats = {
        totalTransactions: (purchaseTransactions?.length || 0) + (salesTransactions?.length || 0),
        existingNotifications: existingNotifications?.length || 0,
        orphanedPurchases: 0,
        orphanedSales: 0,
        notificationsCreated: 0
      };

      const notificationsToCreate: any[] = [];

      // Step 4: Check purchase transactions for orphaned entries
      for (const tx of purchaseTransactions || []) {
        const notificationKey = `transactions-${tx.id}-INSERT`;
        
        if (!existingNotificationKeys.has(notificationKey)) {
          console.log(`[PersistenceService] 🔍 Found orphaned purchase transaction: ${tx.id} (${tx.transaction_number})`);
          
          // Transform to unified Transaction interface for notification data
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
            payment_reference: tx.payment_reference,
            quality_grade: tx.quality_grade,
            deductions: tx.deductions,
            final_amount: tx.final_amount,
            receipt_number: tx.receipt_number,
            notes: tx.notes,
            created_by: tx.created_by,
            updated_at: tx.updated_at,
            supplier_name: tx.supplier_name || tx.suppliers?.name
          };

          // Calculate expiry (24 hours from transaction creation)
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
            created_at: tx.created_at // Use transaction creation time
          });
          
          stats.orphanedPurchases++;
        }
      }

      // Step 5: Check sales transactions for orphaned entries
      for (const tx of salesTransactions || []) {
        const notificationKey = `sales_transactions-${tx.id}-INSERT`;
        
        if (!existingNotificationKeys.has(notificationKey)) {
          console.log(`[PersistenceService] 🔍 Found orphaned sales transaction: ${tx.id} (${tx.transaction_id})`);
          
          // Transform to unified Transaction interface for notification data
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

          // Calculate expiry (24 hours from transaction creation)
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
            created_at: tx.created_at // Use transaction creation time
          });
          
          stats.orphanedSales++;
        }
      }

      // Step 6: Bulk create notifications for orphaned transactions
      if (notificationsToCreate.length > 0) {
        console.log(`[PersistenceService] 🚀 Creating ${notificationsToCreate.length} notifications for orphaned transactions...`);
        
        const { data: createdNotifications, error: createError } = await supabase
          .from('notification_states')
          .insert(notificationsToCreate)
          .select();

        if (createError) {
          console.error('Error creating orphaned transaction notifications:', createError);
          throw createError;
        }

        stats.notificationsCreated = createdNotifications?.length || 0;
        console.log(`[PersistenceService] ✅ Successfully created ${stats.notificationsCreated} notifications for orphaned transactions`);
      }

      console.log(`[PersistenceService] 🔍 Orphaned transaction recovery completed:`, stats);
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

  /**
   * Get notification statistics with enhanced details
   */
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

  /**
   * Bulk update notification statuses (useful for admin operations)
   */
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

  /**
   * ENHANCED: Get notifications for a specific user/session - NEVER return handled notifications
   */
  static async getNotificationsForUser(userIdentifier: string, includeHandled = false): Promise<any[]> {
    try {
      let query = supabase
        .from('notification_states')
        .select('*')
        .order('created_at', { ascending: true });

      // CRITICAL: NEVER include handled notifications unless explicitly requested AND it's for admin purposes
      if (!includeHandled) {
        query = query.eq('is_handled', false).eq('is_dismissed', false);
      } else {
        // Even if includeHandled is true, we should warn about this
        console.warn('[PersistenceService] ⚠️ Including handled notifications - this should only be for admin/debug purposes');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user notifications:', error);
        return [];
      }

      // TRIPLE CHECK: Additional filter to ensure no handled notifications slip through
      const filteredData = includeHandled ? data : (data || []).filter(n => {
        if (n.is_handled === true || n.is_dismissed === true) {
          console.warn(`[PersistenceService] 🚨 CRITICAL: Filtered out handled/dismissed notification ${n.id} that somehow got through query`);
          return false;
        }
        return true;
      });
      
      console.log(`[PersistenceService] Retrieved ${filteredData?.length || 0} ${includeHandled ? 'total' : 'unhandled'} notifications`);
      return filteredData || [];
    } catch (error) {
      console.error('Error in getNotificationsForUser:', error);
      return [];
    }
  }

  /**
   * Clean up inactive sessions
   */
  static async cleanupInactiveSessions(maxAgeHours = 168): Promise<number> { // Default 7 days
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
   * ENHANCED: Initialize periodic cleanup with orphaned transaction recovery
   */
  static startPeriodicCleanup(intervalMinutes = 60): () => void {
    const cleanup = async () => {
      console.log('[PersistenceService] 🔄 Running periodic cleanup with orphaned recovery...');
      
      try {
        // Step 1: Recover orphaned transactions
        const orphanedStats = await this.recoverOrphanedTransactions();
        if (orphanedStats.notificationsCreated > 0) {
          console.log(`[PersistenceService] ✅ Recovered ${orphanedStats.notificationsCreated} orphaned transactions`);
        }
        
        // Step 2: Expire old notifications
        await this.expireNotifications();
        
        // Step 3: Clean up handled/dismissed notifications older than 24 hours
        await this.cleanupNotifications({ maxAge: 24, includeHandled: true, includeDismissed: true });
        
        // Step 4: Clean up inactive sessions older than 7 days
        await this.cleanupInactiveSessions(168);
        
        // Step 5: Permanently delete handled notifications older than 1 hour (aggressive cleanup)
        await this.permanentlyDeleteHandledNotifications(1);
        
        // Step 6: Log comprehensive stats
        const stats = await this.getNotificationStats();
        console.log('[PersistenceService] 📊 Current notification stats:', stats);
        console.log('[PersistenceService] 📊 Orphaned recovery stats:', orphanedStats);
        
      } catch (error) {
        console.error('[PersistenceService] Error in periodic cleanup:', error);
      }
    };

    // Run cleanup immediately
    cleanup();

    // Set up interval
    const intervalId = setInterval(cleanup, intervalMinutes * 60 * 1000);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('[PersistenceService] Periodic cleanup stopped');
    };
  }

  /**
   * Generate unique device identifier (for userIdentifier)
   */
  static generateDeviceIdentifier(): string {
    // Try to get from localStorage first
    const stored = localStorage.getItem('device_identifier');
    if (stored) {
      return stored;
    }

    // Generate new identifier
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

    // Store for future use
    localStorage.setItem('device_identifier', deviceId);
    
    return deviceId;
  }

  /**
   * ENHANCED: Emergency recovery - ONLY recover unhandled notifications with orphaned transaction check
   */
  static async emergencyRecovery(): Promise<any[]> {
    try {
      console.log('[PersistenceService] 🚨 Running emergency recovery (unhandled notifications only + orphaned transactions)...');
      
      // Step 1: First recover any orphaned transactions
      const orphanedStats = await this.recoverOrphanedTransactions();
      console.log(`[PersistenceService] Emergency recovery found ${orphanedStats.notificationsCreated} orphaned transactions`);
      
      // Step 2: Get all truly unhandled notifications
      const { data, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_handled', false)  // MUST be unhandled
        .eq('is_dismissed', false) // MUST not be dismissed
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error in emergency recovery:', error);
        return [];
      }

      // Step 3: Additional safety filter to ensure no handled notifications
      const unhandledOnly = (data || []).filter(n => {
        if (n.is_handled === true) {
          console.error(`[PersistenceService] 🚨 CRITICAL: Filtered out handled notification ${n.id} from recovery`);
          return false;
        }
        if (n.is_dismissed === true) {
          console.log(`[PersistenceService] Filtered out dismissed notification ${n.id} from recovery`);
          return false;
        }
        
        // Additional localStorage check
        const handledKeys = [`handled_${n.id}`, `dismissed_${n.id}`];
        for (const key of handledKeys) {
          if (localStorage.getItem(key)) {
            console.log(`[PersistenceService] Filtered out locally handled notification ${n.id} from recovery`);
            return false;
          }
        }
        
        return true;
      });

      console.log(`[PersistenceService] Emergency recovery completed: ${unhandledOnly.length} UNHANDLED notifications recovered (filtered from ${data?.length || 0} total, plus ${orphanedStats.notificationsCreated} orphaned)`);
      
      // Log details for debugging
      if (unhandledOnly.length > 0) {
        console.log('[PersistenceService] 📋 Recovered notifications:', 
          unhandledOnly.map(n => ({
            id: n.id,
            transaction_id: n.transaction_id,
            transaction_table: n.transaction_table,
            event_type: n.event_type,
            is_handled: n.is_handled,
            is_dismissed: n.is_dismissed,
            created_at: n.created_at
          }))
        );
      }
      
      return unhandledOnly;
    } catch (error) {
      console.error('Error in emergency recovery:', error);
      return [];
    }
  }

  /**
   * ENHANCED: Permanently delete handled notifications to prevent recovery
   */
  static async permanentlyDeleteHandledNotifications(maxAgeHours = 1): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
      
      console.log(`[PersistenceService] Permanently deleting handled notifications older than ${maxAgeHours} hours...`);
      
      // Delete handled notifications that are older than the cutoff time
      const { data, error, count } = await supabase
        .from('notification_states')
        .delete()
        .eq('is_handled', true)
        .lt('handled_at', cutoffTime);

      if (error) {
        console.error('Error permanently deleting handled notifications:', error);
        return 0;
      }

      if (count && count > 0) {
        console.log(`[PersistenceService] ♻️ Permanently deleted ${count} handled notifications`);
      }

      return count || 0;
    } catch (error) {
      console.error('Error in permanentlyDeleteHandledNotifications:', error);
      return 0;
    }
  }

  /**
   * Check if a notification has been handled
   */
  static async isNotificationHandled(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('notification_states')
        .select('is_handled')
        .eq('id', notificationId)
        .single();

      if (error) {
        console.error('Error checking notification handled status:', error);
        return false;
      }

      return data?.is_handled === true;
    } catch (error) {
      console.error('Error in isNotificationHandled:', error);
      return false;
    }
  }

  /**
   * ENHANCED: Get only truly pending notifications (unhandled and not dismissed)
   */
  static async getPendingNotifications(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_handled', false)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending notifications:', error);
        return [];
      }

      // Additional filtering to be absolutely sure
      const trulyPending = (data || []).filter(n => {
        if (n.is_handled === true || n.is_dismissed === true) {
          console.warn(`[PersistenceService] 🚨 Filtered out handled/dismissed notification ${n.id} from pending query`);
          return false;
        }
        return true;
      });

      console.log(`[PersistenceService] Found ${trulyPending.length} truly pending notifications (from ${data?.length || 0} query results)`);
      return trulyPending;
    } catch (error) {
      console.error('Error in getPendingNotifications:', error);
      return [];
    }
  }

  /**
   * NEW: Comprehensive system health check
   */
  static async performHealthCheck(): Promise<{
    notifications: NotificationStats;
    orphaned: OrphanedTransactionStats;
    recommendations: string[];
  }> {
    try {
      console.log('[PersistenceService] 🏥 Performing comprehensive system health check...');
      
      // Get current notification stats
      const notifications = await this.getNotificationStats();
      
      // Check for orphaned transactions
      const orphaned = await this.recoverOrphanedTransactions();
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (orphaned.orphanedPurchases > 0 || orphaned.orphanedSales > 0) {
        recommendations.push(`Found ${orphaned.orphanedPurchases + orphaned.orphanedSales} orphaned transactions - notifications have been created`);
      }
      
      if (notifications.pending > 50) {
        recommendations.push(`High number of pending notifications (${notifications.pending}) - consider reviewing unhandled transactions`);
      }
      
      if (notifications.handled > 1000) {
        recommendations.push(`Large number of handled notifications (${notifications.handled}) - consider running cleanup`);
      }
      
      if (notifications.expired > 0) {
        recommendations.push(`${notifications.expired} notifications have expired - running auto-expiry`);
        await this.expireNotifications();
      }
      
      console.log('[PersistenceService] 🏥 Health check completed');
      
      return {
        notifications,
        orphaned,
        recommendations
      };
    } catch (error) {
      console.error('[PersistenceService] Error in health check:', error);
      return {
        notifications: { total: 0, handled: 0, dismissed: 0, pending: 0, expired: 0 },
        orphaned: { totalTransactions: 0, existingNotifications: 0, orphanedPurchases: 0, orphanedSales: 0, notificationsCreated: 0 },
        recommendations: ['Health check failed - please try again']
      };
    }
  }
}

// Enhanced hook for using the notification persistence service
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