import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import mapboxgl from 'mapbox-gl';
import { Prayer } from '../types/prayer';

interface PrayerMarkerProps {
  prayer: Prayer;
  map: mapboxgl.Map | null;
  onClick: () => void;
  isPrayed?: boolean;
}

export function PrayerMarker({ prayer, map, onClick, isPrayed }: PrayerMarkerProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // Consider anything under 1024px as mobile/tablet
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!map) return;

    const updatePosition = () => {
      const point = map.project([prayer.location.lng, prayer.location.lat]);
      setPosition({ x: point.x, y: point.y });
    };

    updatePosition();
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
    };
  }, [map, prayer.location]);

  if (!position) return null;

  const getPreviewText = () => {
    if (prayer.title) return prayer.title;
    const words = prayer.content.split(' ').slice(0, 3).join(' ');
    return words + '...';
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 20, // Ensure markers are above everything
        padding: '20px', // Invisible padding for larger hit area
        margin: '-20px' // Negative margin to maintain visual position
      }}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      {/* Preview Bubble - Always visible on mobile/tablet, hover on desktop */}
      <AnimatePresence>
        {(isMobile || isHovered) && (
          <motion.div
            initial={isMobile ? { opacity: 1, y: -50, scale: 1 } : { opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={isMobile ? {} : { opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 glass-strong rounded-xl px-4 py-2 whitespace-nowrap max-w-[200px]"
            style={{ pointerEvents: 'none' }} // Don't interfere with marker clicks
          >
            <p className="text-sm text-gray-700 truncate">{getPreviewText()}</p>
            <div 
              className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white/40"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prayer Emoji Marker */}
      <motion.button
        onClick={onClick}
        className="relative z-10"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        animate={isPrayed ? {} : { 
          y: [0, -5, 0],
        }}
        transition={isPrayed ? {} : {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className={`text-4xl ${isPrayed ? 'opacity-60' : 'animate-pulse-glow'}`}>
          🙏
        </div>
        
        {/* Glow effect for active prayers */}
        {!isPrayed && (
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-300/30 blur-xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ pointerEvents: 'none' }} // Don't interfere with clicks
          />
        )}
      </motion.button>
    </div>
  );
}