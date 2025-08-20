// src/services/notificationPersistenceService.ts
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

export class NotificationPersistenceService {
  
  /**
   * Clean up old notifications based on criteria
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

      console.log(`Cleaned up ${count || 0} old notifications`);
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
        .eq('is_dismissed', false);

      if (error) {
        console.error('Error expiring notifications:', error);
        return 0;
      }

      console.log(`Auto-expired ${count || 0} notifications`);
      return count || 0;
    } catch (error) {
      console.error('Error in notification expiry:', error);
      return 0;
    }
  }

  /**
   * Get notification statistics
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
        
        if (notification.is_dismissed) {
          acc.dismissed++;
        } else if (notification.is_handled) {
          acc.handled++;
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

      console.log(`Bulk updated ${notificationIds.length} notifications`);
      return true;
    } catch (error) {
      console.error('Error in bulk notification update:', error);
      return false;
    }
  }

  /**
   * Get notifications for a specific user/session
   */
  static async getNotificationsForUser(userIdentifier: string, includeHandled = false): Promise<any[]> {
    try {
      let query = supabase
        .from('notification_states')
        .select('*')
        .order('created_at', { ascending: true });

      if (!includeHandled) {
        query = query.eq('is_handled', false).eq('is_dismissed', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user notifications:', error);
        return [];
      }

      return data || [];
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

      console.log(`Cleaned up ${count || 0} inactive sessions`);
      return count || 0;
    } catch (error) {
      console.error('Error in session cleanup:', error);
      return 0;
    }
  }

  /**
   * Initialize periodic cleanup (call this once in your app)
   */
  static startPeriodicCleanup(intervalMinutes = 60): () => void {
    const cleanup = async () => {
      console.log('[NotificationPersistenceService] Running periodic cleanup...');
      
      // Expire old notifications
      await this.expireNotifications();
      
      // Clean up handled/dismissed notifications older than 24 hours
      await this.cleanupNotifications({ maxAge: 24, includeHandled: true, includeDismissed: true });
      
      // Clean up inactive sessions older than 7 days
      await this.cleanupInactiveSessions(168);
      
      // Log stats
      const stats = await this.getNotificationStats();
      console.log('[NotificationPersistenceService] Current notification stats:', stats);
    };

    // Run cleanup immediately
    cleanup();

    // Set up interval
    const intervalId = setInterval(cleanup, intervalMinutes * 60 * 1000);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('[NotificationPersistenceService] Periodic cleanup stopped');
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
   * Emergency recovery: reload all unhandled notifications
   */
  static async emergencyRecovery(): Promise<any[]> {
    try {
      console.log('[NotificationPersistenceService] Running emergency recovery...');
      
      const { data, error } = await supabase
        .from('notification_states')
        .select('*')
        .eq('is_handled', false)
        .eq('is_dismissed', false)
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error in emergency recovery:', error);
        return [];
      }

      console.log(`[NotificationPersistenceService] Emergency recovery found ${data?.length || 0} notifications`);
      return data || [];
    } catch (error) {
      console.error('Error in emergency recovery:', error);
      return [];
    }
  }
}

// Hook for using the notification persistence service
export const useNotificationPersistence = () => {
  return {
    cleanupNotifications: NotificationPersistenceService.cleanupNotifications,
    expireNotifications: NotificationPersistenceService.expireNotifications,
    getNotificationStats: NotificationPersistenceService.getNotificationStats,
    bulkUpdateNotifications: NotificationPersistenceService.bulkUpdateNotifications,
    getNotificationsForUser: NotificationPersistenceService.getNotificationsForUser,
    cleanupInactiveSessions: NotificationPersistenceService.cleanupInactiveSessions,
    emergencyRecovery: NotificationPersistenceService.emergencyRecovery
  };
};