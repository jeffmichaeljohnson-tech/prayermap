import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, MapPin, Heart, MessageCircle, Sparkles } from 'lucide-react';

// PanInfo type for drag gestures (not exported from framer-motion v11+)
interface PanInfo {
  point: { x: number; y: number };
  delta: { x: number; y: number };
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

const ONBOARDING_SLIDES = [
  {
    icon: MapPin,
    emoji: '🗺️',
    title: 'Welcome to PrayerMap',
    description: 'See where prayer is needed. Send prayer where you are.',
    gradient: 'from-blue-400 via-purple-400 to-indigo-500',
    bgAccent: 'from-blue-200/40 to-purple-200/40',
    iconColor: 'text-blue-500',
  },
  {
    icon: Heart,
    emoji: '🙏',
    title: 'Share Your Heart',
    description: 'Post prayer requests and let others lift you up in prayer.',
    gradient: 'from-rose-400 via-pink-400 to-fuchsia-500',
    bgAccent: 'from-rose-200/40 to-pink-200/40',
    iconColor: 'text-rose-500',
  },
  {
    icon: Sparkles,
    emoji: '✨',
    title: 'Pray for Others',
    description: 'See prayers on the map and respond with your own prayers of support.',
    gradient: 'from-amber-400 via-orange-400 to-yellow-500',
    bgAccent: 'from-amber-200/40 to-orange-200/40',
    iconColor: 'text-amber-500',
  },
  {
    icon: MessageCircle,
    emoji: '💬',
    title: 'Connect & Encourage',
    description: 'Send messages of hope through text, audio, or video.',
    gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
    bgAccent: 'from-emerald-200/40 to-teal-200/40',
    iconColor: 'text-emerald-500',
  },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);

  const handleNext = useCallback(() => {
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentSlide]);

  const handlePrevious = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('prayermap-onboarding-complete', 'true');
    onComplete();
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && currentSlide < ONBOARDING_SLIDES.length - 1) {
      handleNext();
    } else if (info.offset.x > SWIPE_THRESHOLD && currentSlide > 0) {
      handlePrevious();
    }
    setDragDirection(null);
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -20) {
      setDragDirection('left');
    } else if (info.offset.x > 20) {
      setDragDirection('right');
    } else {
      setDragDirection(null);
    }
  };

  const slide = ONBOARDING_SLIDES[currentSlide];
  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;
  const SlideIcon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Animated background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentSlide}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))]" />
          
          {/* Accent overlay based on current slide */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`absolute inset-0 bg-gradient-to-br ${slide.bgAccent}`}
          />
          
          {/* Floating orbs for depth */}
          <motion.div
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute top-20 right-10 w-32 h-32 rounded-full bg-gradient-to-br ${slide.gradient} opacity-20 blur-3xl`}
          />
          <motion.div
            animate={{
              x: [0, -20, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute bottom-40 left-10 w-40 h-40 rounded-full bg-gradient-to-br ${slide.gradient} opacity-15 blur-3xl`}
          />
        </motion.div>
      </AnimatePresence>

      {/* Skip button */}
      <div className="relative flex justify-end p-4 safe-area-top">
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleSkip}
          className="text-gray-600 text-sm px-4 py-2 rounded-full glass hover:bg-white/30 transition-colors"
        >
          Skip
        </motion.button>
      </div>

      {/* Slide content - draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="relative flex-1 flex flex-col items-center justify-center px-8 cursor-grab active:cursor-grabbing"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: dragDirection === 'right' ? -100 : 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: dragDirection === 'left' ? -100 : 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="text-center max-w-sm pointer-events-none select-none"
          >
            {/* Animated icon container */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.1, 
                type: 'spring', 
                stiffness: 200,
                damping: 15 
              }}
              className="relative mx-auto mb-8"
            >
              {/* Outer glow ring */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.5, 0.3] 
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute -inset-4 rounded-full bg-gradient-to-br ${slide.gradient} opacity-30 blur-xl`}
              />
              
              {/* Icon circle */}
              <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-2xl`}>
                {/* Inner glass overlay */}
                <div className="absolute inset-2 rounded-full bg-white/20 backdrop-blur-sm" />
                
                {/* Emoji */}
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                  className="relative text-6xl drop-shadow-lg"
                >
                  {slide.emoji}
                </motion.span>
              </div>
              
              {/* Floating small icon */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-2 -right-2 p-2 glass-strong rounded-xl shadow-lg"
              >
                <SlideIcon className={`w-5 h-5 ${slide.iconColor}`} />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-3xl font-bold text-gray-800 mb-4 tracking-tight"
            >
              {slide.title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 text-lg leading-relaxed font-body"
            >
              {slide.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
        
        {/* Swipe hint */}
        {currentSlide < ONBOARDING_SLIDES.length - 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="absolute bottom-4 text-xs text-gray-500"
          >
            Swipe or tap to continue
          </motion.p>
        )}
      </motion.div>

      {/* Progress dots & Next button */}
      <div className="relative p-8 pb-12 safe-area-bottom">
        {/* Progress dots */}
        <div className="flex justify-center gap-3 mb-8">
          {ONBOARDING_SLIDES.map((slideItem, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className="relative h-2 rounded-full transition-all overflow-hidden"
              initial={false}
              animate={{
                width: index === currentSlide ? 32 : 8,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              aria-label={`Go to slide ${index + 1}`}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gray-300/50 rounded-full" />
              
              {/* Active fill */}
              {index === currentSlide && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`absolute inset-0 bg-gradient-to-r ${slideItem.gradient} rounded-full origin-left`}
                />
              )}
              
              {/* Completed indicator */}
              {index < currentSlide && (
                <div className={`absolute inset-0 bg-gradient-to-r ${slideItem.gradient} rounded-full opacity-60`} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Next/Get Started button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className={`relative w-full py-4 rounded-2xl text-white font-semibold text-lg flex items-center justify-center gap-2 shadow-lg overflow-hidden`}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
          
          {/* Glass overlay */}
          <div className="absolute inset-0 bg-white/10" />
          
          {/* Content */}
          <span className="relative z-10">
            {isLastSlide ? (
              'Get Started'
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5 inline-block ml-1" />
              </>
            )}
          </span>
          
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          />
        </motion.button>
      </div>
    </div>
  );
}

