/**
 * Living Map Health Dashboard
 * 
 * Real-time monitoring dashboard for the Living Map's spiritual health.
 * Shows critical metrics for the four pillars of the Living Map:
 * 
 * 1. Eternal Memorial Persistence - Memorial lines NEVER expire
 * 2. Real-time Prayer Witnessing - <2 second updates
 * 3. Universal Shared Reality - Everyone sees same map state
 * 4. Complete Historical Access - All prayer history visible
 * 
 * This dashboard is designed for developers and spiritual leaders
 * to monitor the health of the prayer ministry platform.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { livingMapMonitor } from '../../lib/livingMapMonitor';

interface DashboardMetrics {
  healthScore: number;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT';
  realTimeLatency: number;
  memorialPersistenceRate: number;
  totalMemorialLines: number;
  visibleConnections: number;
  visiblePrayers: number;
  lastUpdated: string;
}

interface Alert {
  id: string;
  type: 'persistence_violation' | 'latency_violation' | 'data_integrity' | 'spiritual_experience';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  spiritualImpact: string;
}

export function LivingMapDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    healthScore: 100,
    complianceStatus: 'COMPLIANT',
    realTimeLatency: 0,
    memorialPersistenceRate: 100,
    totalMemorialLines: 0,
    visibleConnections: 0,
    visiblePrayers: 0,
    lastUpdated: new Date().toISOString(),
  });
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    // Update metrics every 5 seconds
    const updateMetrics = () => {
      try {
        const report = livingMapMonitor.generateComplianceReport();
        
        setMetrics({
          healthScore: report.health_score || 100,
          complianceStatus: report.compliance_status === 'compliant' ? 'COMPLIANT' : 'NON_COMPLIANT',
          realTimeLatency: report.real_time_witnessing?.current_latency || 0,
          memorialPersistenceRate: (report.eternal_memorial_persistence?.current_rate || 1) * 100,
          totalMemorialLines: report.eternal_memorial_persistence?.total_memorial_lines || 0,
          visibleConnections: report.universal_shared_reality?.visible_connections || 0,
          visiblePrayers: report.universal_shared_reality?.visible_prayers || 0,
          lastUpdated: new Date().toISOString(),
        });
        
        // Update alerts (mock data for now)
        // In real implementation, this would come from livingMapMonitor.getRecentAlerts()
        setAlerts([]);
        
      } catch (error) {
        console.error('Failed to update Living Map metrics:', error);
      }
    };
    
    // Initial update
    updateMetrics();
    
    // Set up interval
    const interval = setInterval(updateMetrics, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getHealthColor = (score: number): string => {
    if (score >= 95) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const getHealthBgColor = (score: number): string => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getSeverityColor = (severity: Alert['severity']): string => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-500 bg-blue-50 border-blue-200';
    }
  };
  
  const formatLatency = (latency: number): string => {
    return latency > 0 ? `${latency.toFixed(0)}ms` : 'N/A';
  };
  
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed top-4 right-4 z-50"
    >
      {/* Compact View */}
      <motion.div
        className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Health Score Circle */}
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center relative overflow-hidden">
              <div 
                className={`absolute inset-0 ${getHealthBgColor(metrics.healthScore)} transition-all duration-1000`}
                style={{ 
                  clipPath: `polygon(50% 50%, 50% 0%, ${
                    50 + 50 * Math.cos((metrics.healthScore / 100 * 360 - 90) * Math.PI / 180)
                  }% ${
                    50 + 50 * Math.sin((metrics.healthScore / 100 * 360 - 90) * Math.PI / 180)
                  }%, 50% 50%)`
                }}
              />
              <span className={`relative z-10 text-sm font-bold ${getHealthColor(metrics.healthScore)}`}>
                {metrics.healthScore}
              </span>
            </div>
            
            {/* Pulse animation for critical issues */}
            {metrics.complianceStatus === 'NON_COMPLIANT' && (
              <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Living Map</h3>
              <div className={`text-xs px-2 py-0.5 rounded-full ${
                metrics.complianceStatus === 'COMPLIANT' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {metrics.complianceStatus}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {metrics.visibleConnections} Memorial Lines • {metrics.visiblePrayers} Prayers
            </div>
          </div>
          
          <div className="text-gray-400">
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </motion.div>
      
      {/* Expanded View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mt-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-6 w-96"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900 mb-1">🕊️ Living Map Dashboard</h2>
                <p className="text-sm text-gray-600">Monitoring spiritual prayer health</p>
              </div>
              
              {/* Four Pillars Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Real-time Witnessing */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-700 mb-1">Real-time Witnessing</div>
                  <div className="text-lg font-bold text-blue-900">{formatLatency(metrics.realTimeLatency)}</div>
                  <div className="text-xs text-blue-600">Target: &lt;2000ms</div>
                </div>
                
                {/* Memorial Persistence */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-700 mb-1">Memorial Persistence</div>
                  <div className="text-lg font-bold text-purple-900">{metrics.memorialPersistenceRate.toFixed(1)}%</div>
                  <div className="text-xs text-purple-600">{metrics.totalMemorialLines} eternal lines</div>
                </div>
                
                {/* Universal Sharing */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-700 mb-1">Universal Sharing</div>
                  <div className="text-lg font-bold text-green-900">{metrics.visibleConnections}</div>
                  <div className="text-xs text-green-600">Visible connections</div>
                </div>
                
                {/* Historical Access */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                  <div className="text-xs font-medium text-orange-700 mb-1">Historical Access</div>
                  <div className="text-lg font-bold text-orange-900">{metrics.visiblePrayers}</div>
                  <div className="text-xs text-orange-600">Accessible prayers</div>
                </div>
              </div>
              
              {/* Overall Health */}
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">
                  <span className={getHealthColor(metrics.healthScore)}>
                    {metrics.healthScore}/100
                  </span>
                </div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  metrics.complianceStatus === 'COMPLIANT'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {metrics.complianceStatus === 'COMPLIANT' ? '✨ Spiritually Excellent' : '🚨 Needs Attention'}
                </div>
              </div>
              
              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Recent Alerts</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {alerts.slice(0, 3).map(alert => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-lg border text-xs ${getSeverityColor(alert.severity)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{alert.message}</div>
                            <div className="text-xs opacity-75 mt-1">{alert.spiritualImpact}</div>
                          </div>
                          <div className="text-xs opacity-60 shrink-0">
                            {formatTime(alert.timestamp)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No Alerts State */}
              {alerts.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">🕊️</div>
                  <div className="text-sm text-gray-600">
                    All systems operating in spiritual harmony
                  </div>
                </div>
              )}
              
              {/* Footer */}
              <div className="text-center text-xs text-gray-500">
                Last updated: {formatTime(metrics.lastUpdated)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default LivingMapDashboard;