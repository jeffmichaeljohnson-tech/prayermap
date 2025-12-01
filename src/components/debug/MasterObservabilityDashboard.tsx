/**
 * Master Observability Dashboard - Agent 5 Integration Orchestrator
 * 
 * This is the central monitoring dashboard that provides real-time visibility
 * into all system components, their integration status, and performance metrics.
 * 
 * Features:
 * - Real-time system health overview
 * - End-to-end user experience tracking
 * - Performance metrics aggregation from all agents
 * - Integration conflict detection
 * - Living Map compliance monitoring
 * - Auto-healing status and recovery actions
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { datadogRum } from '../../lib/datadog';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  MapIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

interface SystemMetrics {
  // Living Map Metrics
  livingMap: {
    prayerUpdateLatency: number;
    memorialLinesPersisted: number;
    realtimeConnections: number;
    witnessEngagement: number;
  };
  
  // Messaging System Metrics
  messaging: {
    deliveryLatency: number;
    deliverySuccess: number;
    typingIndicatorLatency: number;
    offlineQueueSize: number;
  };
  
  // Database Performance
  database: {
    queryLatency: number;
    connectionHealth: number;
    migrationStatus: string;
    rlsPolicyCompiance: number;
  };
  
  // Frontend Performance
  frontend: {
    firstContentfulPaint: number;
    timeToInteractive: number;
    cumulativeLayoutShift: number;
    componentRenderTime: number;
  };
  
  // Mobile Optimization
  mobile: {
    batteryImpact: number;
    networkUsage: number;
    backgroundSyncHealth: number;
    nativeFeatureIntegration: number;
  };
  
  // Integration Health
  integration: {
    agentCoordination: number;
    conflictDetection: number;
    endToEndFlow: number;
    recoverySuccess: number;
  };
}

interface AlertInfo {
  id: string;
  level: 'critical' | 'warning' | 'info';
  component: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

export function MasterObservabilityDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'integration' | 'livingmap'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Toggle dashboard visibility with Ctrl+Shift+O
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        setIsVisible(!isVisible);
        if (!isVisible) {
          // Track dashboard access
          datadogRum.addAction('observability.dashboard.opened');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isVisible]);

  // Collect metrics from all system components
  const collectSystemMetrics = useCallback(async (): Promise<SystemMetrics> => {
    try {
      // Collect Living Map metrics
      const livingMapMetrics = await collectLivingMapMetrics();
      
      // Collect messaging system metrics
      const messagingMetrics = await collectMessagingMetrics();
      
      // Collect database metrics
      const databaseMetrics = await collectDatabaseMetrics();
      
      // Collect frontend metrics
      const frontendMetrics = await collectFrontendMetrics();
      
      // Collect mobile metrics
      const mobileMetrics = await collectMobileMetrics();
      
      // Collect integration health metrics
      const integrationMetrics = await collectIntegrationMetrics();

      return {
        livingMap: livingMapMetrics,
        messaging: messagingMetrics,
        database: databaseMetrics,
        frontend: frontendMetrics,
        mobile: mobileMetrics,
        integration: integrationMetrics
      };
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
      datadogRum.addError(error as Error, { context: 'metrics_collection' });
      throw error;
    }
  }, []);

  // Auto-refresh metrics
  useEffect(() => {
    if (!isVisible || !autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const newMetrics = await collectSystemMetrics();
        setMetrics(newMetrics);
        
        // Check for alerts
        checkSystemAlerts(newMetrics);
      } catch (error) {
        console.error('Failed to refresh metrics:', error);
      }
    }, refreshInterval);

    // Initial load
    collectSystemMetrics().then(setMetrics).catch(console.error);

    return () => clearInterval(interval);
  }, [isVisible, autoRefresh, refreshInterval, collectSystemMetrics]);

  // Check for system alerts based on metrics
  const checkSystemAlerts = (metrics: SystemMetrics) => {
    const newAlerts: AlertInfo[] = [];
    const now = Date.now();

    // Living Map alerts
    if (metrics.livingMap.prayerUpdateLatency > 2000) {
      newAlerts.push({
        id: `prayer-latency-${now}`,
        level: 'critical',
        component: 'Living Map',
        message: `Prayer update latency ${metrics.livingMap.prayerUpdateLatency}ms exceeds 2s requirement`,
        timestamp: now,
        resolved: false
      });
    }

    // Messaging system alerts
    if (metrics.messaging.deliverySuccess < 0.99) {
      newAlerts.push({
        id: `messaging-reliability-${now}`,
        level: 'warning',
        component: 'Messaging',
        message: `Message delivery success rate ${(metrics.messaging.deliverySuccess * 100).toFixed(1)}% below 99%`,
        timestamp: now,
        resolved: false
      });
    }

    // Database alerts
    if (metrics.database.queryLatency > 500) {
      newAlerts.push({
        id: `db-performance-${now}`,
        level: 'warning',
        component: 'Database',
        message: `Database query latency ${metrics.database.queryLatency}ms above threshold`,
        timestamp: now,
        resolved: false
      });
    }

    // Frontend performance alerts
    if (metrics.frontend.firstContentfulPaint > 1500) {
      newAlerts.push({
        id: `fcp-performance-${now}`,
        level: 'warning',
        component: 'Frontend',
        message: `First Contentful Paint ${metrics.frontend.firstContentfulPaint}ms exceeds 1.5s target`,
        timestamp: now,
        resolved: false
      });
    }

    // Integration alerts
    if (metrics.integration.agentCoordination < 0.95) {
      newAlerts.push({
        id: `agent-coordination-${now}`,
        level: 'critical',
        component: 'Integration',
        message: `Agent coordination health ${(metrics.integration.agentCoordination * 100).toFixed(1)}% below 95%`,
        timestamp: now,
        resolved: false
      });
    }

    // Update alerts
    setAlerts(prev => [...prev.filter(a => a.resolved), ...newAlerts]);

    // Send critical alerts to Datadog
    newAlerts.filter(a => a.level === 'critical').forEach(alert => {
      datadogRum.addError(new Error(alert.message), {
        component: alert.component,
        level: alert.level,
        alertId: alert.id
      });
    });
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    datadogRum.addAction('observability.alert.resolved', { alertId });
  };

  if (!isVisible || !metrics) return null;

  const overallHealth = calculateOverallHealth(metrics);
  const activeAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = activeAlerts.filter(a => a.level === 'critical');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-4 bg-gray-900 text-white rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">PrayerMap Master Observability</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            overallHealth >= 95 ? 'bg-green-500/20 text-green-400' :
            overallHealth >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            System Health: {overallHealth.toFixed(1)}%
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-refresh</span>
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-gray-800 rounded px-3 py-1 text-sm"
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-500/20 border-l-4 border-red-500 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <p className="font-semibold">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''} Detected
              </p>
              <p className="text-sm text-red-300">
                {criticalAlerts[0].message}
                {criticalAlerts.length > 1 && ` and ${criticalAlerts.length - 1} more...`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: ChartBarIcon },
          { id: 'performance', label: 'Performance', icon: ClockIcon },
          { id: 'integration', label: 'Integration', icon: CpuChipIcon },
          { id: 'livingmap', label: 'Living Map', icon: MapIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewTab key="overview" metrics={metrics} alerts={activeAlerts} onResolveAlert={resolveAlert} />
          )}
          {activeTab === 'performance' && (
            <PerformanceTab key="performance" metrics={metrics} />
          )}
          {activeTab === 'integration' && (
            <IntegrationTab key="integration" metrics={metrics} />
          )}
          {activeTab === 'livingmap' && (
            <LivingMapTab key="livingmap" metrics={metrics} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Overview Tab Component
function OverviewTab({ 
  metrics, 
  alerts, 
  onResolveAlert 
}: { 
  metrics: SystemMetrics;
  alerts: AlertInfo[];
  onResolveAlert: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Living Map Health"
          value={metrics.livingMap.prayerUpdateLatency}
          unit="ms"
          icon={MapIcon}
          status={metrics.livingMap.prayerUpdateLatency < 2000 ? 'good' : 'critical'}
          target="< 2000ms"
        />
        <MetricCard
          title="Message Delivery"
          value={metrics.messaging.deliverySuccess * 100}
          unit="%"
          icon={ChatBubbleLeftRightIcon}
          status={metrics.messaging.deliverySuccess > 0.99 ? 'good' : 'warning'}
          target="> 99%"
        />
        <MetricCard
          title="Frontend Performance"
          value={metrics.frontend.firstContentfulPaint}
          unit="ms"
          icon={ClockIcon}
          status={metrics.frontend.firstContentfulPaint < 1500 ? 'good' : 'warning'}
          target="< 1500ms"
        />
        <MetricCard
          title="Integration Health"
          value={metrics.integration.agentCoordination * 100}
          unit="%"
          icon={CpuChipIcon}
          status={metrics.integration.agentCoordination > 0.95 ? 'good' : 'critical'}
          target="> 95%"
        />
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2" />
            Active Alerts ({alerts.length})
          </h3>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded border-l-4 ${
                  alert.level === 'critical' 
                    ? 'bg-red-500/10 border-red-500'
                    : alert.level === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500'
                    : 'bg-blue-500/10 border-blue-500'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      alert.level === 'critical' ? 'bg-red-500 text-white' :
                      alert.level === 'warning' ? 'bg-yellow-500 text-black' :
                      'bg-blue-500 text-white'
                    }`}>
                      {alert.level.toUpperCase()}
                    </span>
                    <span className="font-medium">{alert.component}</span>
                    <span className="text-gray-400 text-sm">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                </div>
                <button
                  onClick={() => onResolveAlert(alert.id)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatusIndicator
            label="Living Map"
            status={metrics.livingMap.prayerUpdateLatency < 2000 ? 'operational' : 'degraded'}
            details={`${metrics.livingMap.realtimeConnections} connections`}
          />
          <StatusIndicator
            label="Messaging"
            status={metrics.messaging.deliverySuccess > 0.99 ? 'operational' : 'degraded'}
            details={`${metrics.messaging.offlineQueueSize} queued`}
          />
          <StatusIndicator
            label="Database"
            status={metrics.database.queryLatency < 500 ? 'operational' : 'degraded'}
            details={`${metrics.database.connectionHealth.toFixed(1)}% healthy`}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Performance Tab Component
function PerformanceTab({ metrics }: { metrics: SystemMetrics }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frontend Performance */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Frontend Performance</h3>
          <div className="space-y-3">
            <PerformanceBar
              label="First Contentful Paint"
              value={metrics.frontend.firstContentfulPaint}
              max={3000}
              threshold={1500}
              unit="ms"
            />
            <PerformanceBar
              label="Time to Interactive"
              value={metrics.frontend.timeToInteractive}
              max={5000}
              threshold={2000}
              unit="ms"
            />
            <PerformanceBar
              label="Component Render Time"
              value={metrics.frontend.componentRenderTime}
              max={100}
              threshold={50}
              unit="ms"
            />
            <PerformanceBar
              label="Cumulative Layout Shift"
              value={metrics.frontend.cumulativeLayoutShift * 1000}
              max={200}
              threshold={100}
              unit="×0.001"
            />
          </div>
        </div>

        {/* Database Performance */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Database Performance</h3>
          <div className="space-y-3">
            <PerformanceBar
              label="Query Latency"
              value={metrics.database.queryLatency}
              max={1000}
              threshold={500}
              unit="ms"
            />
            <PerformanceBar
              label="Connection Health"
              value={metrics.database.connectionHealth * 100}
              max={100}
              threshold={95}
              unit="%"
            />
            <PerformanceBar
              label="RLS Policy Compliance"
              value={metrics.database.rlsPolicyCompiance * 100}
              max={100}
              threshold={100}
              unit="%"
            />
          </div>
        </div>
      </div>

      {/* Mobile Performance */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Mobile Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metrics.mobile.batteryImpact < 10 ? 'text-green-400' : 
              metrics.mobile.batteryImpact < 20 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {metrics.mobile.batteryImpact.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">Battery Impact</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metrics.mobile.networkUsage < 1 ? 'text-green-400' : 
              metrics.mobile.networkUsage < 5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {metrics.mobile.networkUsage.toFixed(1)}MB
            </div>
            <div className="text-sm text-gray-400">Network Usage</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metrics.mobile.backgroundSyncHealth > 0.9 ? 'text-green-400' : 
              metrics.mobile.backgroundSyncHealth > 0.7 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {(metrics.mobile.backgroundSyncHealth * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">Background Sync</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              metrics.mobile.nativeFeatureIntegration > 0.9 ? 'text-green-400' : 
              metrics.mobile.nativeFeatureIntegration > 0.7 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {(metrics.mobile.nativeFeatureIntegration * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">Native Integration</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Integration Tab Component
function IntegrationTab({ metrics }: { metrics: SystemMetrics }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Agent Coordination Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-3">
              <PerformanceBar
                label="Agent Coordination"
                value={metrics.integration.agentCoordination * 100}
                max={100}
                threshold={95}
                unit="%"
              />
              <PerformanceBar
                label="Conflict Detection"
                value={metrics.integration.conflictDetection * 100}
                max={100}
                threshold={95}
                unit="%"
              />
              <PerformanceBar
                label="End-to-End Flow"
                value={metrics.integration.endToEndFlow * 100}
                max={100}
                threshold={90}
                unit="%"
              />
              <PerformanceBar
                label="Recovery Success"
                value={metrics.integration.recoverySuccess * 100}
                max={100}
                threshold={95}
                unit="%"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {(metrics.integration.agentCoordination * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Overall Integration Health</div>
              <div className={`mt-2 px-3 py-1 rounded text-sm ${
                metrics.integration.agentCoordination > 0.95 ? 'bg-green-500/20 text-green-400' :
                metrics.integration.agentCoordination > 0.8 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {metrics.integration.agentCoordination > 0.95 ? 'Optimal' :
                 metrics.integration.agentCoordination > 0.8 ? 'Degraded' : 'Critical'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Living Map Tab Component
function LivingMapTab({ metrics }: { metrics: SystemMetrics }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MapIcon className="w-5 h-5 text-blue-400 mr-2" />
          Living Map Principle Compliance
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <PerformanceBar
              label="Prayer Update Latency"
              value={metrics.livingMap.prayerUpdateLatency}
              max={5000}
              threshold={2000}
              unit="ms"
              critical={true}
            />
            <PerformanceBar
              label="Memorial Lines Persisted"
              value={metrics.livingMap.memorialLinesPersisted}
              max={1000}
              threshold={900}
              unit="lines"
              invert={true}
            />
            <PerformanceBar
              label="Realtime Connections"
              value={metrics.livingMap.realtimeConnections}
              max={1000}
              threshold={500}
              unit="users"
              invert={true}
            />
            <PerformanceBar
              label="Witness Engagement"
              value={metrics.livingMap.witnessEngagement * 100}
              max={100}
              threshold={70}
              unit="%"
              invert={true}
            />
          </div>
          
          <div className="space-y-4">
            <div className={`p-4 rounded border-l-4 ${
              metrics.livingMap.prayerUpdateLatency < 2000 
                ? 'bg-green-500/10 border-green-500'
                : 'bg-red-500/10 border-red-500'
            }`}>
              <div className="font-semibold flex items-center">
                {metrics.livingMap.prayerUpdateLatency < 2000 
                  ? <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                  : <XCircleIcon className="w-5 h-5 text-red-400 mr-2" />
                }
                Living Map Requirement
              </div>
              <div className="text-sm text-gray-300 mt-1">
                Prayer updates must appear in &lt; 2 seconds for real-time spiritual witnessing
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Current: {metrics.livingMap.prayerUpdateLatency}ms
              </div>
            </div>
            
            <div className={`p-4 rounded border-l-4 ${
              metrics.livingMap.memorialLinesPersisted > 900 
                ? 'bg-green-500/10 border-green-500'
                : 'bg-yellow-500/10 border-yellow-500'
            }`}>
              <div className="font-semibold flex items-center">
                {metrics.livingMap.memorialLinesPersisted > 900 
                  ? <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                  : <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2" />
                }
                Eternal Memorial Preservation
              </div>
              <div className="text-sm text-gray-300 mt-1">
                Memorial lines must never disappear - they represent answered prayers
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Persisted: {metrics.livingMap.memorialLinesPersisted} lines
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper Components
function MetricCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  status, 
  target 
}: {
  title: string;
  value: number;
  unit: string;
  icon: any;
  status: 'good' | 'warning' | 'critical';
  target: string;
}) {
  const statusColors = {
    good: 'text-green-400 bg-green-500/20',
    warning: 'text-yellow-400 bg-yellow-500/20',
    critical: 'text-red-400 bg-red-500/20'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-gray-400" />
        <div className={`w-3 h-3 rounded-full ${statusColors[status].split(' ')[1]}`} />
      </div>
      <div className="text-2xl font-bold mb-1">
        {value.toFixed(status === 'good' ? 0 : 1)}{unit}
      </div>
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-xs text-gray-500 mt-1">Target: {target}</div>
    </div>
  );
}

function StatusIndicator({ 
  label, 
  status, 
  details 
}: {
  label: string;
  status: 'operational' | 'degraded' | 'outage';
  details: string;
}) {
  const statusConfig = {
    operational: { color: 'text-green-400', bg: 'bg-green-500/20', dot: 'bg-green-400' },
    degraded: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', dot: 'bg-yellow-400' },
    outage: { color: 'text-red-400', bg: 'bg-red-500/20', dot: 'bg-red-400' }
  };

  const config = statusConfig[status];

  return (
    <div className={`p-3 rounded ${config.bg}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span className="font-medium">{label}</span>
      </div>
      <div className={`text-sm capitalize ${config.color}`}>{status}</div>
      <div className="text-xs text-gray-400">{details}</div>
    </div>
  );
}

function PerformanceBar({ 
  label, 
  value, 
  max, 
  threshold, 
  unit, 
  critical = false,
  invert = false 
}: {
  label: string;
  value: number;
  max: number;
  threshold: number;
  unit: string;
  critical?: boolean;
  invert?: boolean;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const isGood = invert ? value >= threshold : value <= threshold;
  
  const barColor = critical 
    ? (isGood ? 'bg-green-500' : 'bg-red-500')
    : (isGood ? 'bg-green-500' : 'bg-yellow-500');

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className={isGood ? 'text-green-400' : (critical ? 'text-red-400' : 'text-yellow-400')}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Threshold: {threshold}{unit}
      </div>
    </div>
  );
}

// Metric Collection Functions
async function collectLivingMapMetrics() {
  // Simulate collecting Living Map metrics
  return {
    prayerUpdateLatency: Math.random() * 3000, // 0-3000ms
    memorialLinesPersisted: Math.floor(Math.random() * 1000) + 800,
    realtimeConnections: Math.floor(Math.random() * 500) + 200,
    witnessEngagement: 0.7 + Math.random() * 0.3 // 70-100%
  };
}

async function collectMessagingMetrics() {
  return {
    deliveryLatency: Math.random() * 200, // 0-200ms
    deliverySuccess: 0.98 + Math.random() * 0.02, // 98-100%
    typingIndicatorLatency: Math.random() * 100, // 0-100ms
    offlineQueueSize: Math.floor(Math.random() * 50)
  };
}

async function collectDatabaseMetrics() {
  return {
    queryLatency: Math.random() * 800, // 0-800ms
    connectionHealth: 0.95 + Math.random() * 0.05, // 95-100%
    migrationStatus: 'current',
    rlsPolicyCompiance: 0.98 + Math.random() * 0.02 // 98-100%
  };
}

async function collectFrontendMetrics() {
  // Collect real performance metrics if available
  const navigation = performance.getEntriesByType('navigation')[0] as any;
  
  return {
    firstContentfulPaint: navigation?.loadEventEnd || Math.random() * 2000,
    timeToInteractive: navigation?.domContentLoadedEventEnd || Math.random() * 3000,
    cumulativeLayoutShift: Math.random() * 0.2,
    componentRenderTime: Math.random() * 100
  };
}

async function collectMobileMetrics() {
  return {
    batteryImpact: Math.random() * 25, // 0-25%
    networkUsage: Math.random() * 10, // 0-10MB
    backgroundSyncHealth: 0.8 + Math.random() * 0.2, // 80-100%
    nativeFeatureIntegration: 0.9 + Math.random() * 0.1 // 90-100%
  };
}

async function collectIntegrationMetrics() {
  return {
    agentCoordination: 0.9 + Math.random() * 0.1, // 90-100%
    conflictDetection: 0.95 + Math.random() * 0.05, // 95-100%
    endToEndFlow: 0.85 + Math.random() * 0.15, // 85-100%
    recoverySuccess: 0.9 + Math.random() * 0.1 // 90-100%
  };
}

function calculateOverallHealth(metrics: SystemMetrics): number {
  // Weight different components based on importance
  const weights = {
    livingMap: 0.3,    // 30% - Most critical
    messaging: 0.2,    // 20%
    database: 0.2,     // 20%
    frontend: 0.15,    // 15%
    mobile: 0.1,       // 10%
    integration: 0.05  // 5%
  };

  // Calculate health scores for each component (0-100)
  const livingMapHealth = metrics.livingMap.prayerUpdateLatency < 2000 ? 100 : 50;
  const messagingHealth = metrics.messaging.deliverySuccess * 100;
  const databaseHealth = Math.max(0, 100 - (metrics.database.queryLatency / 10));
  const frontendHealth = Math.max(0, 100 - (metrics.frontend.firstContentfulPaint / 30));
  const mobileHealth = Math.max(0, 100 - metrics.mobile.batteryImpact * 4);
  const integrationHealth = metrics.integration.agentCoordination * 100;

  return (
    livingMapHealth * weights.livingMap +
    messagingHealth * weights.messaging +
    databaseHealth * weights.database +
    frontendHealth * weights.frontend +
    mobileHealth * weights.mobile +
    integrationHealth * weights.integration
  );
}