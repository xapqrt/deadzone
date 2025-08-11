import { Platform } from 'react-native';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

interface SystemInfo {
  platform: string;
  version: string;
  device: string;
  memory?: number;
}

export class PerformanceService {
  private static metrics: PerformanceMetric[] = [];
  private static activeMetrics: Map<string, PerformanceMetric> = new Map();
  private static maxMetrics = 100;

  /**
   * Start tracking a performance metric
   */
  static startTracking(name: string, metadata?: any): void {
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };

    this.activeMetrics.set(name, metric);
  }

  /**
   * End tracking and record the metric
   */
  static endTracking(name: string, additionalMetadata?: any): number | null {
    const metric = this.activeMetrics.get(name);
    if (!metric) {
      if (__DEV__) {
        console.warn(`Performance metric '${name}' was not started`);
      }
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...additionalMetadata },
    };

    this.activeMetrics.delete(name);
    this.addMetric(completedMetric);

    return duration;
  }

  /**
   * Track a function execution time
   */
  static async trackAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    this.startTracking(name, metadata);
    
    try {
      const result = await fn();
      this.endTracking(name, { success: true });
      return result;
    } catch (error) {
      this.endTracking(name, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Track a synchronous function execution time
   */
  static track<T>(name: string, fn: () => T, metadata?: any): T {
    this.startTracking(name, metadata);
    
    try {
      const result = fn();
      this.endTracking(name, { success: true });
      return result;
    } catch (error) {
      this.endTracking(name, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Add a completed metric
   */
  private static addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations in development
    if (__DEV__ && metric.duration && metric.duration > 1000) {
      console.warn(
        `Slow operation detected: ${metric.name} took ${metric.duration}ms`,
        metric.metadata
      );
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(filterByName?: string): PerformanceMetric[] {
    if (filterByName) {
      return this.metrics.filter(metric => metric.name.includes(filterByName));
    }
    return [...this.metrics];
  }

  /**
   * Get average duration for a metric
   */
  static getAverageDuration(name: string): number {
    const filteredMetrics = this.metrics.filter(metric => 
      metric.name === name && metric.duration !== undefined
    );

    if (filteredMetrics.length === 0) return 0;

    const totalDuration = filteredMetrics.reduce(
      (sum, metric) => sum + (metric.duration || 0), 
      0
    );
    
    return totalDuration / filteredMetrics.length;
  }

  /**
   * Get system information
   */
  static getSystemInfo(): SystemInfo {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      device: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
    };
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.activeMetrics.clear();
  }

  /**
   * Get performance summary
   */
  static getSummary(): {
    totalMetrics: number;
    averageResponseTime: number;
    slowOperations: PerformanceMetric[];
    systemInfo: SystemInfo;
  } {
    const totalMetrics = this.metrics.length;
    const durationsOnly = this.metrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);
    
    const averageResponseTime = durationsOnly.length > 0
      ? durationsOnly.reduce((sum, duration) => sum + duration, 0) / durationsOnly.length
      : 0;

    const slowOperations = this.metrics.filter(m => 
      m.duration && m.duration > 1000
    );

    return {
      totalMetrics,
      averageResponseTime,
      slowOperations,
      systemInfo: this.getSystemInfo(),
    };
  }

  /**
   * Export metrics for debugging
   */
  static exportMetrics(): string {
    const summary = this.getSummary();
    const data = {
      summary,
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Track app startup performance
   */
  static trackAppStartup(): void {
    this.startTracking('app_startup', { 
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
    });
  }

  /**
   * Mark app as ready
   */
  static markAppReady(): void {
    this.endTracking('app_startup', {
      appReadyTime: new Date().toISOString(),
    });
  }

  /**
   * Track screen navigation
   */
  static trackScreenNavigation(fromScreen: string, toScreen: string): void {
    this.startTracking(`navigation_${fromScreen}_to_${toScreen}`, {
      fromScreen,
      toScreen,
      timestamp: new Date().toISOString(),
    });

    // Auto-end after a reasonable time
    setTimeout(() => {
      if (this.activeMetrics.has(`navigation_${fromScreen}_to_${toScreen}`)) {
        this.endTracking(`navigation_${fromScreen}_to_${toScreen}`, {
          autoEnded: true,
        });
      }
    }, 5000);
  }

  /**
   * Track network requests
   */
  static trackNetworkRequest(url: string, method = 'GET'): string {
    const trackingId = `network_${method}_${Date.now()}`;
    this.startTracking(trackingId, {
      url,
      method,
      timestamp: new Date().toISOString(),
    });
    return trackingId;
  }

  /**
   * End network request tracking
   */
  static endNetworkRequest(
    trackingId: string, 
    success: boolean, 
    statusCode?: number,
    error?: string
  ): void {
    this.endTracking(trackingId, {
      success,
      statusCode,
      error,
    });
  }
}

// Performance tracking helpers
export const trackPerformance = PerformanceService.track;
export const trackPerformanceAsync = PerformanceService.trackAsync;

// Common performance tracking points
export const PerformancePoints = {
  APP_STARTUP: 'app_startup',
  USER_LOGIN: 'user_login',
  MESSAGE_SEND: 'message_send',
  MESSAGE_LOAD: 'message_load',
  SYNC_OPERATION: 'sync_operation',
  SCREEN_RENDER: 'screen_render',
  DATABASE_QUERY: 'database_query',
  NETWORK_REQUEST: 'network_request',
} as const;
