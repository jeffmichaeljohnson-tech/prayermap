import { motion } from 'framer-motion';
import SunCalc from 'suncalc';

interface SunMoonIndicatorProps {
  location: { lat: number; lng: number };
}

export function SunMoonIndicator({ location }: SunMoonIndicatorProps) {
  const now = new Date();
  
  // Get accurate sunrise and sunset times using SunCalc library
  const sunTimes = SunCalc.getTimes(now, location.lat, location.lng);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;
  
  // Check if we're currently in nighttime
  const isNightTime = now < sunrise || now > sunset;
  
  // Check if we're in transition period (30 min before/after sunset or sunrise)
  const isTransition = 
    (now >= new Date(sunset.getTime() - 30 * 60000) && now <= new Date(sunset.getTime() + 30 * 60000)) || 
    (now >= new Date(sunrise.getTime() - 30 * 60000) && now <= new Date(sunrise.getTime() + 30 * 60000));
  
  // Determine next event
  let nextEvent: Date;
  let nextEventLabel: string;
  
  if (isNightTime) {
    // If it's nighttime, show next sunrise
    if (now > sunset) {
      // After sunset today, show tomorrow's sunrise
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowSunTimes = SunCalc.getTimes(tomorrow, location.lat, location.lng);
      nextEvent = tomorrowSunTimes.sunrise;
    } else {
      // Before sunrise today, show today's sunrise
      nextEvent = sunrise;
    }
    nextEventLabel = 'Sunrise';
  } else {
    // If it's daytime, show today's sunset
    nextEvent = sunset;
    nextEventLabel = 'Sunset';
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="glass-strong rounded-xl p-2.5 flex flex-col items-center gap-1"
    >
      {/* Sun or Moon Icon */}
      <div className="relative w-8 h-8 flex items-center justify-center">
        {isNightTime ? (
          // Ethereal Glass Moon
          <motion.div
            key="moon"
            className="relative w-6 h-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: [1, 1.05, 1],
            }}
            transition={{
              opacity: { duration: 0.3 },
              scale: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            {/* Moon body - ethereal glass effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-100/95 via-indigo-50/85 to-purple-100/90 backdrop-blur-sm shadow-lg"
              style={{
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.5)'
              }}
            />

            {/* Inner highlight for depth */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/50 via-blue-50/30 to-transparent" />

            {/* Soft outer glow */}
            <div className="absolute inset-0 rounded-full bg-indigo-200/40 blur-md scale-125" />

            {/* Gentle pulse glow */}
            <motion.div
              className="absolute inset-0 rounded-full bg-purple-200/30 blur-lg scale-150"
              animate={{
                opacity: [0.2, 0.5, 0.2],
                scale: [1.5, 1.7, 1.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Crescent shadow for moon phases */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-300/20 to-transparent" />
            </div>
          </motion.div>
        ) : (
          // Ethereal Sun
          <motion.div
            key="sun"
            className="relative w-6 h-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: [0, -2, 0],
              scale: 1,
            }}
            transition={{
              opacity: { duration: 0.3 },
              y: {
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            {/* Main sun body */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200 via-yellow-300 to-orange-300"
              style={{
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
              }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(251, 191, 36, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                  '0 0 30px rgba(251, 146, 60, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
                  '0 0 20px rgba(251, 191, 36, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Inner glow highlight */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-100/60 via-transparent to-transparent" />

            {/* Soft outer glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300/40 to-orange-300/40 blur-md scale-125" />

            {/* Sunset animation */}
            {isTransition && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(251, 113, 133, 0.4) 0%, transparent 70%)',
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            )}

            {/* Ethereal rays */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-0.5 bg-gradient-to-t from-yellow-300/0 via-yellow-400/40 to-yellow-300/0 rounded-full"
                  style={{
                    height: '12px',
                    transform: `rotate(${i * 60}deg)`,
                    transformOrigin: 'center center',
                  }}
                  animate={{
                    opacity: [0.4, 0.8, 0.4],
                    height: ['12px', '14px', '12px'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Event Label and Time */}
      <div className="text-center">
        <p className="text-[9px] uppercase tracking-wider text-gray-500">
          {nextEventLabel}
        </p>
        <p className="text-sm text-gray-700 font-medium">
          {nextEvent.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </p>
      </div>
    </motion.div>
  );
}