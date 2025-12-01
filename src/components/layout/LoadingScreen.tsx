import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function LoadingScreen() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))]">
      <motion.div
        initial={{ scale: reducedMotion ? 1 : 0.5, opacity: reducedMotion ? 1 : 0 }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={reducedMotion ? { duration: 0 } : {
          duration: 1.5,
          times: [0, 0.6, 1],
          ease: "easeOut"
        }}
        className="text-center"
      >
        <motion.div
          animate={reducedMotion ? {} : {
            y: [0, -15, 0],
          }}
          transition={reducedMotion ? { duration: 0 } : {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-8xl mb-6"
        >
          🙏
        </motion.div>

        <motion.h1
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.5, duration: 0.8 }}
          className="text-gray-800 tracking-wider"
        >
          PrayerMap
        </motion.h1>

        <motion.p
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 1, duration: 0.8 }}
          className="text-gray-700 mt-2 italic"
        >
          We could all pray harder for our neighbor.
        </motion.p>

        <motion.div
          initial={{ width: reducedMotion ? "100%" : 0 }}
          animate={{ width: "100%" }}
          transition={reducedMotion ? { duration: 0 } : { delay: 1.2, duration: 1 }}
          className="h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mt-8 rounded-full max-w-xs mx-auto"
        />
      </motion.div>
    </div>
  );
}