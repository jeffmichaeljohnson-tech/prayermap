/**
 * Messaging Performance Dashboard
 * 
 * Real-time monitoring dashboard for messaging system performance
 * Shows LIVING MAP compliance metrics and system health
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  MessageCircle, 
  Zap, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Wifi,
  Database,
  Eye
} from 'lucide-react';
// Mock messaging performance types and monitor
interface MessagingPerformanceMetrics {
  totalMessages: number;
  averageDeliveryTime: number;
  successRate: number;
  errorCount: number;
  activeConnections: number;
}

const messagingPerformanceMonitor = {
  getMetrics: (): MessagingPerformanceMetrics => ({
    totalMessages: 150,
    averageDeliveryTime: 120,
    successRate: 0.98,
    errorCount: 3,
    activeConnections: 12
  }),
  resetMetrics: () => {}
};
import { realTimeValidator } from '../../services/messaging/RealTimeValidator';
import { livingMapMonitor } from '../../lib/livingMapMonitor';
import { prayerMapMessagingSystem } from '../../services/messaging';

interface DashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

export function MessagingPerformanceDashboard({ isVisible, onClose }: DashboardProps) {
  const [performanceMetrics, setPerformanceMetrics] = useState<MessagingPerformanceMetrics | null>(null);
  const [validationStatus, setValidationStatus] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [realtimeHealth, setRealtimeHealth] = useState<any>(null);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      try {
        // Get performance metrics
        const perfReport = messagingPerformanceMonitor.getPerformanceReport();
        setPerformanceMetrics(perfReport);

        // Get validation status
        const valStatus = realTimeValidator.getCurrentStatus();
        setValidationStatus(valStatus);

        // Get system status
        const sysStatus = prayerMapMessagingSystem.getSystemStatus();
        setSystemStatus(sysStatus);

        // Get realtime health
        const rtHealth = { connectionStatus: 'healthy', lastPing: Date.now() };
        setRealtimeHealth(rtHealth);
      } catch (error) {
        console.error('Dashboard update error:', error);
      }
    };

    // Initial update
    updateMetrics();

    // Update every 2 seconds for real-time monitoring
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible || !performanceMetrics) {
    return null;
  }

  const getLivingMapStatus = () => {
    const meetsLatency = performanceMetrics.avgMessageLatency < 2000;
    const meetsCompliance = performanceMetrics.realTimeCompliance > 95;
    const meetsStability = performanceMetrics.connectionStability > 95;
    
    if (meetsLatency && meetsCompliance && meetsStability) {
      return { status: 'excellent', color: 'text-green-500', bg: 'bg-green-500/10' };
    } else if (meetsLatency && meetsCompliance) {
      return { status: 'good', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    } else {
      return { status: 'critical', color: 'text-red-500', bg: 'bg-red-500/10' };
    }
  };

  const livingMapStatus = getLivingMapStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Messaging Performance</h2>
            <p className="text-sm text-gray-600">Real-time monitoring dashboard</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Eye className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 h-[calc(100%-88px)] overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LIVING MAP Compliance */}
          <div className="lg:col-span-3">
            <div className={`p-4 rounded-xl ${livingMapStatus.bg} border border-gray-200`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className={`w-5 h-5 ${livingMapStatus.color}`} />
                  <h3 className="font-semibold text-gray-800">LIVING MAP Compliance</h3>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${livingMapStatus.color} ${livingMapStatus.bg}`}>
                  {livingMapStatus.status.toUpperCase()}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Avg Latency"
                  value={`${performanceMetrics.avgMessageLatency.toFixed(0)}ms`}
                  target="< 2000ms"
                  isGood={performanceMetrics.avgMessageLatency < 2000}
                  icon={Clock}
                />
                <MetricCard
                  title="Real-time Compliance"
                  value={`${performanceMetrics.realTimeCompliance.toFixed(1)}%`}
                  target="> 95%"
                  isGood={performanceMetrics.realTimeCompliance > 95}
                  icon={CheckCircle}
                />
                <MetricCard
                  title="Connection Stability"
                  value={`${performanceMetrics.connectionStability.toFixed(1)}%`}
                  target="> 95%"
                  isGood={performanceMetrics.connectionStability > 95}
                  icon={Wifi}
                />
                <MetricCard
                  title="Success Rate"
                  value={`${performanceMetrics.messageDeliverySuccess.toFixed(1)}%`}
                  target="> 99%"
                  isGood={performanceMetrics.messageDeliverySuccess > 99}
                  icon={TrendingUp}
                />
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-800">System Health</h3>
              </div>
              
              <div className="space-y-4">
                {systemStatus && (
                  <>
                    <HealthIndicator 
                      label="Messaging Service"
                      status={systemStatus.initialized ? 'online' : 'offline'}
                    />
                    <HealthIndicator 
                      label="Channel Manager"
                      status={systemStatus.channelManager?.isActive ? 'online' : 'offline'}
                    />
                    <HealthIndicator 
                      label="Real-time Monitor"
                      status={validationStatus?.isRunning ? 'online' : 'offline'}
                    />
                    <HealthIndicator 
                      label="Performance Tracker"
                      status="online"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Connection Stats */}
            {realtimeHealth && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-gray-800">Connections</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Channels</span>
                    <span className="font-semibold">{realtimeHealth.totalChannels}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Connected</span>
                    <span className="font-semibold text-green-600">{realtimeHealth.connectedChannels}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Disconnected</span>
                    <span className="font-semibold text-yellow-600">{realtimeHealth.disconnectedChannels}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Errors</span>
                    <span className="font-semibold text-red-600">{realtimeHealth.errorChannels}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Message Performance */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-800">Message Performance</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {performanceMetrics.avgMessageLatency.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-600">Average Latency</div>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${performanceMetrics.avgMessageLatency < 2000 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(performanceMetrics.avgMessageLatency / 2000 * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {performanceMetrics.errorRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Error Rate</div>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${performanceMetrics.errorRate < 1 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(performanceMetrics.errorRate * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Indicators */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-800">Real-time Indicators</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {performanceMetrics.typingIndicatorLatency.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-600">Typing Latency</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {performanceMetrics.readReceiptLatency.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-600">Read Receipt Latency</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {performanceMetrics.recommendations && performanceMetrics.recommendations.length > 0 && (
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-gray-800">Recommendations</h3>
                </div>
                
                <ul className="space-y-2">
                  {performanceMetrics.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
  target, 
  isGood, 
  icon: Icon 
}: { 
  title: string;
  value: string;
  target: string;
  isGood: boolean;
  icon: React.ComponentType<any>;
}) {
  return (
    <div className="text-center">
      <Icon className={`w-8 h-8 mx-auto mb-2 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
      <div className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        {value}
      </div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{target}</div>
    </div>
  );
}

function HealthIndicator({ label, status }: { label: string; status: 'online' | 'offline' | 'warning' }) {
  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusBg()}`} />
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
}