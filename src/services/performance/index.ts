/**
 * Performance Services - Consolidated Performance Management
 * 
 * Split from the large systemPerformanceOptimizer.ts into focused services:
 * - PerformanceMonitor: Metrics collection and monitoring
 * - PerformanceOptimizer: Optimization logic and actions
 * - LivingMapPerformanceService: Living Map specific optimizations
 * 
 * Maintains Living Map <2 second requirement while providing comprehensive
 * performance optimization across all system components.
 */

export { 
  PerformanceMonitor, 
  performanceMonitor,
  type PerformanceMetrics,
  type PerformanceThresholds
} from './PerformanceMonitor';

export { 
  PerformanceOptimizer,
  performanceOptimizer,
  type OptimizationAction,
  type OptimizationStrategy
} from './PerformanceOptimizer';

export { 
  LivingMapPerformanceService,
  livingMapPerformanceService,
  type LivingMapPerformanceConfig,
  type LivingMapOptimization
} from './LivingMapPerformanceService';

// Convenience function to initialize all performance services
export function initializePerformanceServices(): void {
  console.log('🚀 Initializing performance services...');
  
  // Start performance monitoring
  performanceMonitor.startMonitoring(10000); // Every 10 seconds
  
  // Start performance optimization
  performanceOptimizer.startOptimization(30000); // Every 30 seconds
  
  console.log('✅ Performance services initialized');
}

// Convenience function to get overall performance status
export async function getOverallPerformanceStatus(): Promise<{
  monitoring: { isMonitoring: boolean; metricsCount: number };
  optimization: { isOptimizing: boolean; appliedCount: number };
  livingMap: {
    isCompliant: boolean;
    currentLatency: number;
    qualityLevel: 'high' | 'medium' | 'low';
  };
}> {
  const monitoringStatus = performanceMonitor.getStatus();
  const optimizationStatus = performanceOptimizer.getStatus();
  const livingMapStatus = livingMapPerformanceService.getLivingMapPerformanceStatus();
  
  return {
    monitoring: monitoringStatus,
    optimization: optimizationStatus,
    livingMap: {
      isCompliant: livingMapStatus.isCompliant,
      currentLatency: livingMapStatus.currentLatency,
      qualityLevel: livingMapStatus.qualityLevel
    }
  };
}

// Convenience function to shutdown all performance services
export function shutdownPerformanceServices(): void {
  console.log('🔌 Shutting down performance services...');
  
  performanceMonitor.stopMonitoring();
  performanceOptimizer.stopOptimization();
  
  console.log('✅ Performance services shutdown complete');
}