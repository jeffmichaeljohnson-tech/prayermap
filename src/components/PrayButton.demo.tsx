/**
 * PrayButton Demo Page
 *
 * Interactive demonstration of the PrayButton component
 * showing all states and features.
 *
 * To view: Import this component in your app routing
 */

import { useState } from 'react';
import { PrayButton } from './PrayButton';

export function PrayButtonDemo() {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            PrayButton Component Demo
          </h1>
          <p className="text-gray-600">
            The signature call-to-action for PrayerMap
          </p>
        </div>

        {/* Demo Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Demo 1: Default */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Default Button
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Basic configuration with "Pray First. Then Press." messaging
            </p>
            <PrayButton
              onPray={() => addLog('Default prayer sent')}
            />
          </div>

          {/* Demo 2: With Quick Option */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              With Quick Option
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Shows optional quick prayer button below
            </p>
            <PrayButton
              onPray={() => addLog('Full prayer sent')}
              showQuickOption={true}
            />
          </div>

          {/* Demo 3: Disabled */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Disabled State
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Button is non-interactive when disabled
            </p>
            <PrayButton
              onPray={() => addLog('This should not fire')}
              disabled={true}
            />
          </div>

          {/* Demo 4: Custom Styling */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Custom Styling
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Additional custom classes applied
            </p>
            <PrayButton
              onPray={() => addLog('Styled prayer sent')}
              className="shadow-2xl transform hover:scale-105 transition-transform"
            />
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <h3 className="font-semibold text-gray-800">Beautiful Animations</h3>
                <p className="text-sm text-gray-600">
                  Smooth state transitions with gradient shimmer effects
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="font-semibold text-gray-800">Haptic Feedback</h3>
                <p className="text-sm text-gray-600">
                  Native tactile feedback on iOS and Android
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-semibold text-gray-800">Intentional Design</h3>
                <p className="text-sm text-gray-600">
                  "Pray First" messaging encourages mindful interaction
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">♿</span>
              <div>
                <h3 className="font-semibold text-gray-800">Accessible</h3>
                <p className="text-sm text-gray-600">
                  Full ARIA support and keyboard navigation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Animation Timeline */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Animation Timeline
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-mono text-gray-600">0ms</div>
              <div className="flex-1 border-l-4 border-purple-400 pl-4 py-2">
                <span className="font-semibold">User clicks</span> → Medium haptic
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-mono text-gray-600">200ms</div>
              <div className="flex-1 border-l-4 border-blue-400 pl-4 py-2">
                <span className="font-semibold">Sending state</span> → Prayer start haptic + gradient shimmer
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-mono text-gray-600">6000ms</div>
              <div className="flex-1 border-l-4 border-green-400 pl-4 py-2">
                <span className="font-semibold">Success state</span> → Success haptic + checkmark
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-mono text-gray-600">7500ms</div>
              <div className="flex-1 border-l-4 border-gray-400 pl-4 py-2">
                <span className="font-semibold">Reset</span> → Ready for next prayer
              </div>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Event Log
          </h2>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 h-48 overflow-y-auto">
            {log.length === 0 ? (
              <div className="text-gray-500">
                Click any button above to see events...
              </div>
            ) : (
              log.map((entry, i) => (
                <div key={i} className="mb-1">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-8 bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Usage Example
          </h2>
          <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <code className="text-sm text-gray-100">
{`import { PrayButton } from '@/components/PrayButton';

function MyPrayerForm() {
  const handlePray = () => {
    // Your prayer submission logic
    console.log('Prayer sent!');
  };

  return (
    <PrayButton
      onPray={handlePray}
      showQuickOption={true}
    />
  );
}`}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
