import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface InfoModalProps {
  onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4"
      style={{ zIndex: 50 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-gradient-to-br from-white/80 via-white/70 to-purple-50/60 dark:from-gray-800/90 dark:via-gray-900/85 dark:to-purple-900/70 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full border border-white/60 dark:border-white/10 shadow-xl shadow-purple-200/20 dark:shadow-purple-900/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-gray-800 dark:text-white">How to Use PrayerMap</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Topic 1: Prayer Requests */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-200/60 to-purple-200/60 flex items-center justify-center shadow-lg shadow-purple-200/30 border border-white/40">
              <span className="text-2xl">🙏</span>
            </div>
            <div className="flex-1">
              <h3 className="text-gray-800 dark:text-white mb-2">Prayer Requests</h3>
              <p className="text-gray-600 dark:text-gray-300 text-[14px]">
                Tap any 🙏 emoji on the map to view prayer requests and respond with text, audio, or video messages.
              </p>
            </div>
          </div>

          {/* Topic 2: Memorialized Prayers */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-sky-200/60 to-amber-200/60 flex items-center justify-center shadow-lg shadow-amber-200/30 border border-white/40">
              {/* Memorial Icon - Golden connecting lines */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 12L12 4L20 12M12 4V20"
                  stroke="url(#memorialGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="4" cy="12" r="2" fill="hsl(210, 80%, 70%)" />
                <circle cx="20" cy="12" r="2" fill="hsl(270, 60%, 70%)" />
                <circle cx="12" cy="4" r="2" fill="hsl(45, 100%, 70%)" />
                <defs>
                  <linearGradient id="memorialGradient" x1="4" y1="12" x2="20" y2="12">
                    <stop offset="0%" stopColor="hsl(210, 80%, 70%)" />
                    <stop offset="50%" stopColor="hsl(45, 100%, 70%)" />
                    <stop offset="100%" stopColor="hsl(270, 60%, 70%)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-gray-800 dark:text-white mb-2">Memorialized Prayers</h3>
              <p className="text-gray-600 dark:text-gray-300 text-[14px]">
                Beautiful glowing lines connect you to each person you've prayed for, creating a lasting memorial that remains visible on the map for one year.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/30">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 transition-all text-on-gradient font-semibold shadow-lg shadow-purple-200/30"
          >
            Got it!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
