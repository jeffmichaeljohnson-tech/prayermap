/**
 * Visual diagnostic overlay for debugging
 * Shows FPS, memory, network, errors in real-time
 */

import { useState, useEffect, useRef } from 'react';
import { useDebugMode } from '../lib/debugMode';
import { usePerformanceMetrics } from '../lib/performanceMonitor';
import { useDiagnostics, useConnectivity } from '../lib/diagnostics';
import { errorTracker } from '../lib/errorTracking';

export function DiagnosticOverlay() {
  const debug = useDebugMode();
  const { metrics, componentMetrics, apiMetrics } = usePerformanceMetrics();
  const { online, effectiveType } = useConnectivity();
  const [fps, setFps] = useState(0);
  const [activeTab, setActiveTab] = useState<'performance' | 'errors' | 'network' | 'system'>('performance');
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);

  // FPS counter
  useEffect(() => {
    if (!debug.performanceOverlay) return;

    // Initialize time on mount
    lastTimeRef.current = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [debug.performanceOverlay]);

  if (!debug.enabled || !debug.performanceOverlay) {
    return null;
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatMs = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    return `${ms.toFixed(2)}ms`;
  };

  const getWebVitalStatus = (metric: number | undefined, good: number, needsImprovement: number) => {
    if (metric === undefined) return 'text-gray-400';
    if (metric <= good) return 'text-green-400';
    if (metric <= needsImprovement) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-95 text-white rounded-lg shadow-2xl z-[9999] w-96 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span>Diagnostics</span>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-75">{fps} FPS</span>
          <button
            onClick={() => debug.toggle('performanceOverlay')}
            className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['performance', 'errors', 'network', 'system'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
        {activeTab === 'performance' && (
          <>
            {/* Core Web Vitals */}
            <div>
              <h4 className="font-semibold mb-2 text-blue-400">Core Web Vitals</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>LCP:</span>
                  <span className={getWebVitalStatus(metrics.lcp, 2500, 4000)}>
                    {formatMs(metrics.lcp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FID:</span>
                  <span className={getWebVitalStatus(metrics.fid, 100, 300)}>
                    {formatMs(metrics.fid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CLS:</span>
                  <span className={getWebVitalStatus(metrics.cls, 0.1, 0.25)}>
                    {metrics.cls?.toFixed(3) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FCP:</span>
                  <span className={getWebVitalStatus(metrics.fcp, 1800, 3000)}>
                    {formatMs(metrics.fcp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TTFB:</span>
                  <span className={getWebVitalStatus(metrics.ttfb, 800, 1800)}>
                    {formatMs(metrics.ttfb)}
                  </span>
                </div>
              </div>
            </div>

            {/* Memory */}
            {metrics.jsHeapSize && (
              <div>
                <h4 className="font-semibold mb-2 text-blue-400">Memory</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>{formatBytes(metrics.jsHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Limit:</span>
                    <span>{formatBytes(metrics.jsHeapLimit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span className={metrics.jsHeapUsagePercent! > 90 ? 'text-red-400' : 'text-green-400'}>
                      {metrics.jsHeapUsagePercent?.toFixed(1)}%
                    </span>
                  </div>
                  {/* Memory bar */}
                  <div className="w-full bg-gray-700 h-2 rounded mt-2">
                    <div
                      className={`h-full rounded transition-all ${
                        metrics.jsHeapUsagePercent! > 90
                          ? 'bg-red-500'
                          : metrics.jsHeapUsagePercent! > 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${metrics.jsHeapUsagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Top Components */}
            {componentMetrics.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-blue-400">Slow Components</h4>
                <div className="space-y-1">
                  {componentMetrics.slice(0, 5).map(comp => (
                    <div key={comp.name} className="flex justify-between items-center">
                      <span className="truncate flex-1">{comp.name}</span>
                      <span className={comp.avgRenderTime > 16 ? 'text-red-400' : 'text-gray-400'}>
                        {comp.avgRenderTime.toFixed(2)}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'errors' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-red-400">Recent Errors</h4>
              <button
                onClick={() => errorTracker.clearErrors()}
                className="text-xs px-2 py-1 bg-red-600 rounded hover:bg-red-700"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {errorTracker.getRecentErrors(10).map(err => (
                <details key={err.id} className="bg-gray-800 rounded p-2">
                  <summary className="cursor-pointer hover:text-blue-400">
                    <span className="text-red-400 mr-2">{err.error.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </span>
                  </summary>
                  <div className="mt-2 text-xs space-y-1">
                    <div className="text-gray-300">{err.error.message}</div>
                    {err.error.stack && (
                      <pre className="text-gray-500 overflow-x-auto text-[10px] mt-2">
                        {err.error.stack.split('\n').slice(0, 3).join('\n')}
                      </pre>
                    )}
                  </div>
                </details>
              ))}
              {errorTracker.getRecentErrors(10).length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No errors recorded
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <>
            <div>
              <h4 className="font-semibold mb-2 text-blue-400">Connectivity</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={online ? 'text-green-400' : 'text-red-400'}>
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
                {effectiveType && (
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span>{effectiveType}</span>
                  </div>
                )}
              </div>
            </div>

            {apiMetrics.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-blue-400">API Calls</h4>
                <div className="space-y-1">
                  {apiMetrics.slice(0, 10).map(api => (
                    <details key={api.endpoint} className="bg-gray-800 rounded p-2">
                      <summary className="cursor-pointer hover:text-blue-400 flex justify-between">
                        <span className="truncate flex-1">{api.endpoint}</span>
                        <span className="ml-2">{api.avgDuration.toFixed(0)}ms</span>
                      </summary>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Calls:</span>
                          <span>{api.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success:</span>
                          <span className="text-green-400">{api.successCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Errors:</span>
                          <span className="text-red-400">{api.errorCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Duration:</span>
                          <span>{api.maxDuration.toFixed(0)}ms</span>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'system' && (
          <SystemInfo />
        )}
      </div>
    </div>
  );
}

function SystemInfo() {
  const { report, isLoading, refresh } = useDiagnostics();

  if (isLoading) {
    return <div className="text-center text-gray-400 py-4">Loading...</div>;
  }

  if (!report) {
    return (
      <div className="text-center py-4">
        <button
          onClick={refresh}
          className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Run Diagnostics
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'connected' || status === 'granted') return 'text-green-400';
    if (status === 'prompt' || status === 'unsupported') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-3">
      {/* Browser */}
      <div>
        <h4 className="font-semibold mb-2 text-blue-400">Browser</h4>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Name:</span>
            <span>{report.browser.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Version:</span>
            <span>{report.browser.version}</span>
          </div>
        </div>
      </div>

      {/* Services */}
      <div>
        <h4 className="font-semibold mb-2 text-blue-400">Services</h4>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Supabase:</span>
            <span className={getStatusColor(report.services.supabase)}>
              {report.services.supabase}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Mapbox:</span>
            <span className={getStatusColor(report.services.mapbox)}>
              {report.services.mapbox}
            </span>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div>
        <h4 className="font-semibold mb-2 text-blue-400">Capabilities</h4>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(report.capabilities).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={value ? 'text-green-400' : 'text-red-400'}>
                {value ? '✓' : '✗'}
              </span>
              <span className="capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Storage */}
      <div>
        <h4 className="font-semibold mb-2 text-blue-400">Storage</h4>
        <div className="space-y-1">
          {report.storage.estimatedUsage !== undefined && (
            <>
              <div className="flex justify-between">
                <span>Used:</span>
                <span>{(report.storage.estimatedUsage / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span>Quota:</span>
                <span>{report.storage.estimatedQuota ? (report.storage.estimatedQuota / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'N/A'}</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span>LocalStorage:</span>
            <span>{(report.storage.localStorageUsed / 1024).toFixed(2)} KB</span>
          </div>
        </div>
      </div>

      <button
        onClick={refresh}
        className="w-full px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 text-xs font-medium mt-3"
      >
        Refresh Diagnostics
      </button>
    </div>
  );
}
