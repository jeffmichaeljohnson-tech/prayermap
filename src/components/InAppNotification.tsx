import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Heart, X } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface InAppNotificationProps {
  message: string;
  show: boolean;
  onClose: () => void;
  onClick?: () => void;
}

export function InAppNotification({ message, show, onClose, onClick }: InAppNotificationProps) {
  const reducedMotion = useReducedMotion();

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -50, scale: 0.9 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.3, type: "spring" }}
          className="fixed top-4 right-4 z-50 pointer-events-auto"
        >
          <div
            className={`bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[300px] max-w-[400px] ${
              onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''
            }`}
            onClick={onClick}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  New Prayer Response
                </div>
                <div className="text-sm text-gray-600">
                  {message}
                </div>
                {onClick && (
                  <div className="text-xs text-gray-400 mt-2">
                    Click to view
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}