import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Video, 
  Square, 
  Pause, 
  Play, 
  RotateCcw, 
  Check, 
  RefreshCw, 
  Camera,
  Sparkles,
  Timer,
  Palette,
  Music,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useVideoRecorder, formatVideoDuration } from '../../hooks/useVideoRecorder';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

interface PrayerVideoRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    videoBlob: Blob;
    title: string;
    description: string;
    isAnonymous: boolean;
    category?: string;
    duration: number;
  }) => void;
  maxDuration?: number;
}

const RECORDING_EFFECTS = [
  { name: 'Natural', filter: 'none' },
  { name: 'Warm', filter: 'sepia(20%) saturate(120%) hue-rotate(10deg)' },
  { name: 'Cool', filter: 'hue-rotate(180deg) saturate(110%)' },
  { name: 'Ethereal', filter: 'brightness(110%) contrast(90%) saturate(80%)' },
  { name: 'Vintage', filter: 'sepia(40%) contrast(120%) saturate(80%)' }
];

const PRAYER_CATEGORIES = [
  'Personal',
  'Family',
  'Health',
  'Gratitude',
  'Guidance',
  'Community',
  'World Peace'
];

/**
 * Social media style video recording modal for prayer creation
 * Optimized for vertical 9:16 videos with modern UX patterns
 */
export function PrayerVideoRecordModal({
  isOpen,
  onClose,
  onSubmit,
  maxDuration = 90
}: PrayerVideoRecordModalProps) {
  const [step, setStep] = useState<'record' | 'preview' | 'details'>('record');
  const [selectedEffect, setSelectedEffect] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  const {
    isRecording,
    isPaused,
    duration,
    videoBlob,
    videoUrl,
    error,
    isCameraReady,
    facingMode,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    switchCamera,
    initializeCamera,
    stopCamera,
    videoRef,
  } = useVideoRecorder();

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const effectsContainerRef = useRef<HTMLDivElement>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
      setStep('record');
      setTitle('');
      setDescription('');
      setSelectedCategory('');
      setIsAnonymous(false);
    } else {
      stopCamera();
    }
    
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, initializeCamera, stopCamera]);

  // Auto-stop when max duration reached
  useEffect(() => {
    if (isRecording && !isPaused && duration >= maxDuration) {
      stopRecording();
      setStep('preview');
    }
  }, [isRecording, isPaused, duration, maxDuration, stopRecording]);

  // Track recording session
  useEffect(() => {
    if (isRecording && !recordingStartTime) {
      setRecordingStartTime(Date.now());
    } else if (!isRecording && recordingStartTime) {
      setRecordingStartTime(null);
    }
  }, [isRecording, recordingStartTime]);

  const handleStartRecording = useCallback(() => {
    startRecording();
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Haptic feedback
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    setStep('preview');
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50]); // Double vibration for stop
    }
  }, [stopRecording]);

  const handleRetake = useCallback(() => {
    resetRecording();
    setStep('record');
    initializeCamera();
  }, [resetRecording, initializeCamera]);

  const handleNext = useCallback(() => {
    if (videoBlob) {
      setStep('details');
    }
  }, [videoBlob]);

  const handleSubmit = useCallback(async () => {
    if (!videoBlob || !title.trim()) return;

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        videoBlob,
        title: title.trim(),
        description: description.trim(),
        isAnonymous,
        category: selectedCategory || undefined,
        duration
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit video prayer:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [videoBlob, title, description, isAnonymous, selectedCategory, duration, onSubmit, onClose]);

  const progress = (duration / maxDuration) * 100;
  const hasRecording = !!videoBlob && !!videoUrl;
  const currentEffect = RECORDING_EFFECTS[selectedEffect];

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 glass-strong rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            {/* Step Indicator */}
            <div className="flex gap-1">
              {['record', 'preview', 'details'].map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? 'bg-white' : 
                    (s === 'record' && (step === 'preview' || step === 'details')) ||
                    (s === 'preview' && step === 'details')
                      ? 'bg-white/60' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Recording Step */}
      {step === 'record' && (
        <div className="w-full h-full relative">
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="absolute top-20 left-4 right-4 z-40 glass-strong border border-red-400/30 rounded-xl p-3"
              >
                <p className="text-red-300 text-sm text-center">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Preview Container */}
          <div className="relative w-full h-full bg-black">
            {/* Live Camera Preview */}
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              style={{ 
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                filter: currentEffect.filter
              }}
            />

            {/* Camera Loading State */}
            {!isCameraReady && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/70">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="mb-4"
                >
                  <Camera className="w-16 h-16 text-white/70" />
                </motion.div>
                <p className="text-white/70 text-lg">Preparing camera...</p>
              </div>
            )}

            {/* Recording Overlay Effects */}
            {isRecording && !isPaused && (
              <>
                {/* Ethereal border animation */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(45deg, rgba(255,215,0,0.3), rgba(255,192,203,0.3), rgba(147,112,219,0.3), rgba(135,206,250,0.3))',
                    backgroundSize: '400% 400%',
                    padding: '4px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                />
                
                {/* Floating prayer elements */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-2xl pointer-events-none"
                    style={{
                      left: `${20 + i * 30}%`,
                      top: `${20 + i * 20}%`
                    }}
                    animate={{
                      y: [-10, -30, -10],
                      opacity: [0.3, 0.7, 0.3],
                      rotate: [-5, 5, -5]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      delay: i * 0.8,
                      ease: 'easeInOut'
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </>
            )}

            {/* Idle State */}
            {isCameraReady && !isRecording && !hasRecording && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-4xl mb-4"
                  >
                    🙏
                  </motion.div>
                  <p className="text-white text-lg font-medium">Share your prayer</p>
                  <p className="text-white/70 text-sm mt-1">Tap the record button to begin</p>
                </motion.div>
              </div>
            )}

            {/* Paused State */}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-strong p-4 rounded-full"
                >
                  <Pause className="w-8 h-8 text-white" />
                </motion.div>
              </div>
            )}
          </div>

          {/* Top Controls */}
          <div className="absolute top-16 left-4 right-4 flex items-center justify-between z-40">
            {/* Timer */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-gradient-to-br from-white/70 via-white/50 to-white/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-lg flex items-center gap-2 ${
                isRecording && !isPaused ? 'from-red-100/80 via-red-50/60 to-red-50/40 border-red-200/60' : ''
              }`}
            >
              {isRecording && !isPaused && (
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 bg-red-500 rounded-full shadow-lg"
                />
              )}
              <Timer className="w-4 h-4 text-gray-700" />
              <span className="text-gray-700 font-mono text-sm font-medium">
                {formatVideoDuration(duration)} / {formatVideoDuration(maxDuration)}
              </span>
            </motion.div>

            {/* Camera Switch */}
            {isCameraReady && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={switchCamera}
                className="bg-gradient-to-br from-white/70 via-white/50 to-white/30 backdrop-blur-md p-3 rounded-full border border-white/40 shadow-lg hover:from-white/80 hover:via-white/60 hover:to-white/40 transition-all"
                aria-label="Switch camera"
              >
                <RefreshCw className="w-5 h-5 text-gray-700" />
              </motion.button>
            )}
          </div>

          {/* Effect Selector */}
          <div className="absolute top-32 left-4 right-4 z-40">
            <div 
              ref={effectsContainerRef}
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {RECORDING_EFFECTS.map((effect, index) => (
                <motion.button
                  key={effect.name}
                  onClick={() => setSelectedEffect(index)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedEffect === index
                      ? 'bg-gradient-to-r from-yellow-300/80 to-purple-300/80 text-gray-800'
                      : 'glass-strong text-white hover:bg-white/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {effect.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Progress Ring (when recording) */}
          {isRecording && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40">
              <svg className="w-20 h-20 -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="transparent"
                  stroke="url(#progressGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * progress) / 100}
                />
                <defs>
                  <linearGradient id="progressGradient">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="50%" stopColor="#FF69B4" />
                    <stop offset="100%" stopColor="#9370DB" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 z-40">
            {/* Ready to Record */}
            {isCameraReady && !isRecording && !hasRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Button
                  onClick={handleStartRecording}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-xl shadow-red-500/40 border-4 border-white/50"
                >
                  <Video className="w-8 h-8" />
                </Button>
              </motion.div>
            )}

            {/* Currently Recording */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-6"
              >
                <Button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="w-14 h-14 rounded-full glass-strong hover:bg-white/30 border border-white/40"
                >
                  {isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}
                </Button>

                <Button
                  onClick={handleStopRecording}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-xl shadow-red-500/40 border-4 border-white/50"
                >
                  <Square className="w-8 h-8 fill-current" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && hasRecording && (
        <div className="w-full h-full relative">
          {/* Video Preview */}
          <video
            ref={previewVideoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            controls
            playsInline
            autoPlay
            style={{ filter: currentEffect.filter }}
          />

          {/* Overlay Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 z-40">
            <Button
              onClick={handleRetake}
              className="w-16 h-16 rounded-full glass-strong hover:bg-white/30 border border-white/40"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </Button>

            <Button
              onClick={handleNext}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 text-white shadow-xl shadow-green-500/40 border-4 border-white/50"
            >
              <Check className="w-8 h-8" />
            </Button>
          </div>

          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-strong px-4 py-2 rounded-full">
            <p className="text-white text-sm">
              {formatVideoDuration(duration)} • {currentEffect.name} filter
            </p>
          </div>
        </div>
      )}

      {/* Details Step */}
      {step === 'details' && (
        <motion.div
          className="w-full h-full bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 overflow-y-auto"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="p-6 pt-20 space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Add Details</h2>
              <p className="text-white/70">Help others understand your prayer</p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-white font-medium">Prayer Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What would you like prayer for?"
                className="w-full glass border-0 focus:ring-2 focus:ring-purple-300 rounded-xl p-4 text-white placeholder-white/50"
                maxLength={100}
              />
              <p className="text-white/50 text-xs text-right">
                {title.length}/100
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-white font-medium">Description (Optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share more details about your prayer request..."
                rows={4}
                className="glass border-0 focus:ring-2 focus:ring-purple-300 resize-none text-white placeholder-white/50"
                maxLength={500}
              />
              <p className="text-white/50 text-xs text-right">
                {description.length}/500
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-white font-medium">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {PRAYER_CATEGORIES.map((category) => (
                  <motion.button
                    key={category}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category ? '' : category
                    )}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-gray-800'
                        : 'glass hover:bg-white/20 text-white'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {category}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Anonymous Toggle */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Share Anonymously</p>
                  <p className="text-white/70 text-sm mt-1">
                    Your identity will be hidden from others
                  </p>
                </div>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || isSubmitting}
                className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-4 text-lg font-semibold disabled:opacity-50"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-gray-800/30 border-t-gray-800 rounded-full"
                  />
                ) : (
                  'Share Prayer Video'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}