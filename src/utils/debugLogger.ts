// src/utils/debugLogger.ts
// Debug logger utility for tracking notification system issues

class DebugLogger {
  private logs: Array<{
    timestamp: string;
    type: 'info' | 'warn' | 'error' | 'state';
    component: string;
    message: string;
    data?: any;
  }> = [];

  private enabled: boolean = true;
  private maxLogs: number = 100;

  constructor() {
    // Make logger accessible from console
    if (typeof window !== 'undefined') {
      (window as any).notificationDebug = this;
      console.log('🔍 Debug Logger enabled. Access logs with: window.notificationDebug.showLogs()');
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  }

  log(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    
    const entry = {
      timestamp: this.formatTimestamp(),
      type: 'info' as const,
      component,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined // Deep clone to preserve state
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log(`📘 [${entry.timestamp}] [${component}] ${message}`, data || '');
  }

  warn(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    
    const entry = {
      timestamp: this.formatTimestamp(),
      type: 'warn' as const,
      component,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.warn(`⚠️ [${entry.timestamp}] [${component}] ${message}`, data || '');
  }

  error(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    
    const entry = {
      timestamp: this.formatTimestamp(),
      type: 'error' as const,
      component,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.error(`❌ [${entry.timestamp}] [${component}] ${message}`, data || '');
  }

  state(component: string, message: string, state: any) {
    if (!this.enabled) return;
    
    const entry = {
      timestamp: this.formatTimestamp(),
      type: 'state' as const,
      component,
      message,
      data: JSON.parse(JSON.stringify(state)) // Deep clone to preserve state
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log(`📊 [${entry.timestamp}] [${component}] ${message}`, state);
  }

  showLogs() {
    console.group('🔍 Notification System Debug Logs');
    this.logs.forEach(log => {
      const icon = {
        info: '📘',
        warn: '⚠️',
        error: '❌',
        state: '📊'
      }[log.type];
      
      console.log(`${icon} [${log.timestamp}] [${log.component}] ${log.message}`);
      if (log.data) {
        console.log('   Data:', log.data);
      }
    });
    console.groupEnd();
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    console.log('🧹 Debug logs cleared');
  }

  downloadLogs() {
    const logsJson = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 Logs downloaded');
  }

  enable() {
    this.enabled = true;
    console.log('✅ Debug logging enabled');
  }

  disable() {
    this.enabled = false;
    console.log('❌ Debug logging disabled');
  }

  getLastError() {
    const errors = this.logs.filter(l => l.type === 'error');
    return errors[errors.length - 1] || null;
  }

  getStateHistory(component: string) {
    return this.logs
      .filter(l => l.component === component && l.type === 'state')
      .map(l => ({ timestamp: l.timestamp, state: l.data }));
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

export default debugLogger;