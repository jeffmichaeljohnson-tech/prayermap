/**
 * PrayButton Component
 *
 * The signature call-to-action for PrayerMap:
 * "Pray First. Then Press."
 *
 * Features:
 * - Two-phase interaction (read instruction, then press)
 * - Haptic feedback on press
 * - Beautiful gradient animation
 * - Accessibility compliant
 *
 * @example
 * <PrayButton
 *   onPray={() => sendPrayer()}
 *   isLoading={isSending}
 *   showQuickOption={true}
 * />
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, Loader2 } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';

interface PrayButtonProps {
  onPray: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  /** Show quick pray option (one tap) */
  showQuickOption?: boolean;
  className?: string;
}

type ButtonState = 'ready' | 'pressing' | 'sending' | 'success';

export function PrayButton({
  onPray,
  disabled = false,
  isLoading = false,
  showQuickOption = false,
  className = ''
}: PrayButtonProps) {
  const [state, setState] = useState<ButtonState>('ready');
  const [isHeld, setIsHeld] = useState(false);
  const haptic = useHaptic();

  const handlePointerDown = useCallback(() => {
    if (disabled || isLoading) return;
    setIsHeld(true);
    haptic.light();
  }, [disabled, isLoading, haptic]);

  const handlePointerUp = useCallback(() => {
    setIsHeld(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || isLoading || state === 'sending') return;

    haptic.medium();
    setState('pressing');

    // Brief anticipation before triggering
    setTimeout(() => {
      setState('sending');
      haptic.prayerStart();
      onPray();

      // Reset after animation would complete
      setTimeout(() => {
        setState('success');
        haptic.success();

        setTimeout(() => {
          setState('ready');
        }, 1500);
      }, 6000);
    }, 200);
  }, [disabled, isLoading, state, onPray, haptic]);

  const handleQuickPray = useCallback(() => {
    if (disabled || isLoading) return;

    haptic.light();
    onPray();
  }, [disabled, isLoading, onPray, haptic]);

  const isActive = state !== 'ready';

  return (
    <div className={`relative ${className}`}>
      {/* Main Prayer Button */}
      <motion.button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={disabled || isLoading}
        className={`
          relative w-full py-4 px-8 rounded-2xl
          font-medium text-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isActive ? 'text-white' : 'text-gray-800'}
        `}
        style={{
          background: isActive
            ? 'linear-gradient(135deg, #F7E7CE 0%, #D4C5F9 50%, #E8F4F8 100%)'
            : 'linear-gradient(135deg, #FEF3C7 0%, #E9D5FF 50%, #DBEAFE 100%)',
        }}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        animate={{
          boxShadow: isHeld
            ? '0 4px 20px rgba(147, 112, 219, 0.4)'
            : '0 4px 15px rgba(147, 112, 219, 0.2)'
        }}
        aria-label="Send prayer with intention"
        aria-busy={state === 'sending'}
      >
        {/* Gradient overlay animation */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
          animate={{
            x: isActive ? ['0%', '200%'] : '0%',
            opacity: isActive ? [0, 0.5, 0] : 0
          }}
          transition={{
            duration: 1.5,
            repeat: isActive ? Infinity : 0,
            ease: 'linear'
          }}
        />

        {/* Button content */}
        <AnimatePresence mode="wait">
          {state === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-sm text-gray-600 font-normal">
                Pray First.
              </span>
              <span className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Then Press.
              </span>
            </motion.div>
          )}

          {state === 'pressing' && (
            <motion.div
              key="pressing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-5 h-5" />
              </motion.div>
              <span>Sending prayer...</span>
            </motion.div>
          )}

          {state === 'sending' && (
            <motion.div
              key="sending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ✨
              </motion.span>
              <span>Prayer in flight...</span>
            </motion.div>
          )}

          {state === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.4 }}
              >
                ✓
              </motion.span>
              <span>Prayer sent with love</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Quick Pray Option */}
      {showQuickOption && state === 'ready' && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleQuickPray}
          className="
            mt-3 w-full py-2 px-4
            text-sm text-gray-500
            hover:text-gray-700
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-1
            rounded-lg
          "
          aria-label="Send quick prayer without message"
        >
          <span className="flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            Quick prayer (no message)
          </span>
        </motion.button>
      )}
    </div>
  );
}
