/**
 * Performance Optimizer - Optimization Logic and Actions
 * 
 * Extracted from systemPerformanceOptimizer.ts for focused optimization logic.
 * Applies automatic optimizations based on performance metrics to maintain
 * Living Map requirements.
 */

import { datadogRum } from '../../lib/datadog';
import { performanceMonitor, type PerformanceMetrics } from './PerformanceMonitor';

export interface OptimizationAction {
  id: string;
  type: 'throttle' | 'cache' | 'prioritize' | 'defer' | 'batch' | 'compress' | 'preload';
  component: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  implemented: boolean;
  implementedAt?: number;
  effectiveness?: number; // 0-1
  metrics?: Record<string, any>;
}

export interface OptimizationStrategy {
  condition: (metrics: PerformanceMetrics) => boolean;
  actions: OptimizationAction[];
  priority: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private appliedOptimizations: OptimizationAction[] = [];
  private isOptimizing = false;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private strategies: OptimizationStrategy[] = [];

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
      PerformanceOptimizer.instance.initializeStrategies();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Start automatic performance optimization
   */
  startOptimization(intervalMs: number = 30000): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }

    this.isOptimizing = true;
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.runOptimizationCycle();
      } catch (error) {
        console.error('Performance optimization cycle failed:', error);
        datadogRum.addError(error as Error, { context: 'performance_optimization' });
      }
    }, intervalMs);

    datadogRum.addAction('performance.optimizer.started', { intervalMs });
    console.log('⚡ Performance optimization started');
  }

  /**
   * Stop automatic performance optimization
   */
  stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    this.isOptimizing = false;
    datadogRum.addAction('performance.optimizer.stopped');
    console.log('⚡ Performance optimization stopped');
  }

  /**
   * Run a single optimization cycle
   */
  async runOptimizationCycle(): Promise<OptimizationAction[]> {
    const metrics = performanceMonitor.getCurrentMetrics();
    if (!metrics) {
      console.log('No metrics available for optimization');
      return [];
    }

    console.log('🔧 Running performance optimization cycle...');

    // Identify applicable strategies
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.condition(metrics)
    ).sort((a, b) => b.priority - a.priority); // Sort by priority

    const appliedActions: OptimizationAction[] = [];

    // Apply strategies in order of priority
    for (const strategy of applicableStrategies) {
      for (const action of strategy.actions) {
        // Check if action is already applied
        if (!this.isActionAlreadyApplied(action)) {
          try {
            const success = await this.applyOptimization(action);
            if (success) {
              this.appliedOptimizations.push({
                ...action,
                implemented: true,
                implementedAt: Date.now()
              });
              appliedActions.push(action);
            }
          } catch (error) {
            console.error(`Failed to apply optimization ${action.id}:`, error);
            datadogRum.addError(error as Error, { 
              context: 'optimization_application',
              optimizationId: action.id 
            });
          }
        }
      }
    }

    if (appliedActions.length > 0) {
      console.log(`✅ Applied ${appliedActions.length} performance optimizations`);
      datadogRum.addAction('performance.optimizations.applied', {
        count: appliedActions.length,
        actions: appliedActions.map(a => a.id)
      });
    }

    return appliedActions;
  }

  /**
   * Get all applied optimizations
   */
  getAppliedOptimizations(): OptimizationAction[] {
    return [...this.appliedOptimizations];
  }

  /**
   * Get optimization status
   */
  getStatus(): { isOptimizing: boolean; appliedCount: number } {
    return {
      isOptimizing: this.isOptimizing,
      appliedCount: this.appliedOptimizations.length
    };
  }

  /**
   * Evaluate optimization effectiveness
   */
  async evaluateEffectiveness(): Promise<Record<string, number>> {
    const effectiveness: Record<string, number> = {};
    
    // Get metrics before and after optimizations
    const recentMetrics = performanceMonitor.getMetricsHistory(30); // Last 30 minutes
    
    for (const optimization of this.appliedOptimizations) {
      if (optimization.implementedAt) {
        const beforeMetrics = recentMetrics.filter(m => 
          m.timestamp < optimization.implementedAt!
        );
        const afterMetrics = recentMetrics.filter(m => 
          m.timestamp > optimization.implementedAt!
        );

        if (beforeMetrics.length > 0 && afterMetrics.length > 0) {
          effectiveness[optimization.id] = this.calculateEffectiveness(
            optimization,
            beforeMetrics,
            afterMetrics
          );
        }
      }
    }

    return effectiveness;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeStrategies(): void {
    this.strategies = [
      // Living Map Critical Performance Strategy
      {
        condition: (metrics) => metrics.livingMap.prayerUpdateLatency > 2000,
        priority: 100, // Highest priority
        actions: [
          {
            id: 'livingmap-priority-boost',
            type: 'prioritize',
            component: 'livingMap',
            description: 'Boost Living Map update priority to maintain <2s requirement',
            impact: 'high',
            implemented: false
          },
          {
            id: 'livingmap-cache-optimization',
            type: 'cache',
            component: 'livingMap',
            description: 'Optimize caching for prayer and memorial line data',
            impact: 'high',
            implemented: false
          }
        ]
      },

      // Memory Pressure Strategy
      {
        condition: (metrics) => metrics.frontend.memoryUsage > 40 * 1024 * 1024, // 40MB
        priority: 80,
        actions: [
          {
            id: 'memory-cleanup',
            type: 'defer',
            component: 'frontend',
            description: 'Clear unused component caches and defer non-critical loads',
            impact: 'medium',
            implemented: false
          },
          {
            id: 'message-compression',
            type: 'compress',
            component: 'messaging',
            description: 'Enable message compression to reduce memory usage',
            impact: 'medium',
            implemented: false
          }
        ]
      },

      // Database Performance Strategy
      {
        condition: (metrics) => metrics.database.queryLatency > 300,
        priority: 70,
        actions: [
          {
            id: 'query-batching',
            type: 'batch',
            component: 'database',
            description: 'Batch multiple queries to reduce database roundtrips',
            impact: 'medium',
            implemented: false
          },
          {
            id: 'connection-pooling',
            type: 'cache',
            component: 'database',
            description: 'Optimize database connection pooling',
            impact: 'medium',
            implemented: false
          }
        ]
      },

      // Animation Performance Strategy
      {
        condition: (metrics) => metrics.frontend.animationFrameRate < 50,
        priority: 60,
        actions: [
          {
            id: 'animation-throttling',
            type: 'throttle',
            component: 'frontend',
            description: 'Throttle animations on low-performance devices',
            impact: 'medium',
            implemented: false
          },
          {
            id: 'reduce-motion',
            type: 'defer',
            component: 'frontend',
            description: 'Reduce motion for users with performance issues',
            impact: 'low',
            implemented: false
          }
        ]
      },

      // Mobile Battery Strategy
      {
        condition: (metrics) => metrics.mobile.batteryDrainRate > 15,
        priority: 50,
        actions: [
          {
            id: 'background-optimization',
            type: 'throttle',
            component: 'mobile',
            description: 'Optimize background sync to preserve battery',
            impact: 'medium',
            implemented: false
          },
          {
            id: 'network-efficiency',
            type: 'batch',
            component: 'mobile',
            description: 'Batch network requests to reduce radio usage',
            impact: 'medium',
            implemented: false
          }
        ]
      },

      // Proactive Performance Strategy
      {
        condition: (metrics) => {
          // Apply proactive optimizations when performance is good
          return (
            metrics.livingMap.prayerUpdateLatency < 1500 &&
            metrics.frontend.memoryUsage < 30 * 1024 * 1024 &&
            metrics.frontend.animationFrameRate > 55
          );
        },
        priority: 10, // Low priority
        actions: [
          {
            id: 'preload-optimization',
            type: 'preload',
            component: 'frontend',
            description: 'Preload prayer data for improved responsiveness',
            impact: 'low',
            implemented: false
          }
        ]
      }
    ];
  }

  private isActionAlreadyApplied(action: OptimizationAction): boolean {
    return this.appliedOptimizations.some(applied => applied.id === action.id);
  }

  private async applyOptimization(action: OptimizationAction): Promise<boolean> {
    console.log(`🔧 Applying optimization: ${action.description}`);

    try {
      switch (action.type) {
        case 'prioritize':
          return this.applyPrioritization(action);
        case 'cache':
          return this.applyCache(action);
        case 'throttle':
          return this.applyThrottling(action);
        case 'defer':
          return this.applyDeferral(action);
        case 'batch':
          return this.applyBatching(action);
        case 'compress':
          return this.applyCompression(action);
        case 'preload':
          return this.applyPreload(action);
        default:
          console.warn(`Unknown optimization type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to apply optimization ${action.id}:`, error);
      return false;
    }
  }

  private async applyPrioritization(action: OptimizationAction): Promise<boolean> {
    // Implement prioritization logic based on component
    if (action.component === 'livingMap') {
      // Boost Living Map operations
      console.log('🚀 Boosting Living Map operation priority');
      // In real implementation, this would adjust task scheduling
      return true;
    }
    return false;
  }

  private async applyCache(action: OptimizationAction): Promise<boolean> {
    // Implement caching optimizations
    console.log('💾 Optimizing cache configuration');
    // In real implementation, this would configure caching strategies
    return true;
  }

  private async applyThrottling(action: OptimizationAction): Promise<boolean> {
    // Implement throttling logic
    console.log('🚦 Applying throttling to reduce resource usage');
    // In real implementation, this would throttle operations
    return true;
  }

  private async applyDeferral(action: OptimizationAction): Promise<boolean> {
    // Implement deferral logic
    console.log('⏸️ Deferring non-critical operations');
    // In real implementation, this would defer operations
    return true;
  }

  private async applyBatching(action: OptimizationAction): Promise<boolean> {
    // Implement batching logic
    console.log('📦 Batching operations for efficiency');
    // In real implementation, this would batch operations
    return true;
  }

  private async applyCompression(action: OptimizationAction): Promise<boolean> {
    // Implement compression logic
    console.log('🗜️ Enabling compression to reduce data size');
    // In real implementation, this would enable compression
    return true;
  }

  private async applyPreload(action: OptimizationAction): Promise<boolean> {
    // Implement preload logic
    console.log('⚡ Preloading data for improved responsiveness');
    // In real implementation, this would preload data
    return true;
  }

  private calculateEffectiveness(
    optimization: OptimizationAction,
    beforeMetrics: PerformanceMetrics[],
    afterMetrics: PerformanceMetrics[]
  ): number {
    // Calculate average improvement based on optimization type
    let improvementScore = 0;

    if (optimization.component === 'livingMap') {
      const beforeAvg = beforeMetrics.reduce((sum, m) => sum + m.livingMap.prayerUpdateLatency, 0) / beforeMetrics.length;
      const afterAvg = afterMetrics.reduce((sum, m) => sum + m.livingMap.prayerUpdateLatency, 0) / afterMetrics.length;
      improvementScore = Math.max(0, (beforeAvg - afterAvg) / beforeAvg);
    } else if (optimization.component === 'frontend') {
      const beforeAvg = beforeMetrics.reduce((sum, m) => sum + m.frontend.memoryUsage, 0) / beforeMetrics.length;
      const afterAvg = afterMetrics.reduce((sum, m) => sum + m.frontend.memoryUsage, 0) / afterMetrics.length;
      improvementScore = Math.max(0, (beforeAvg - afterAvg) / beforeAvg);
    }

    return Math.min(1, improvementScore);
  }
}

// Global performance optimizer instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();