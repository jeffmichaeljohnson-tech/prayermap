import { motion } from 'motion/react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))]">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ 
          scale: [0.5, 1.2, 1],
          opacity: [0, 1, 1],
        }}
        transition={{
          duration: 1.5,
          times: [0, 0.6, 1],
          ease: "easeOut"
        }}
        className="text-center"
      >
        <motion.div
          animate={{ 
            y: [0, -15, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-8xl mb-6"
        >
          🙏
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-gray-800 tracking-wider"
        >
          PrayerMap
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-gray-700 mt-2 italic"
        >
          We could all pray harder for our neighbor.
        </motion.p>
        
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 1.2, duration: 1 }}
          className="h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mt-8 rounded-full max-w-xs mx-auto"
        />
      </motion.div>
    </div>
  );
}