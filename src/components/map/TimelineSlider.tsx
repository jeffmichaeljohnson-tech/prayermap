/**
 * TimelineSlider - Time-travel feature for viewing prayer connections over time
 *
 * Handles:
 * - Interactive timeline slider with date range
 * - Animated playback of prayer network growth
 * - Filter modes (cumulative vs window)
 * - Speed controls for playback
 * - Mobile-friendly touch gestures
 * - Minimizable interface
 *
 * Design: Glassmorphic "Ethereal Glass" design system
 * Performance: 60fps animations, smooth transitions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Play,
  Pause,
  Calendar,
  ChevronUp,
  ChevronDown,
  Clock,
  TrendingUp,
  Filter
} from 'lucide-react';
import type { PrayerConnection } from '../../types/prayer';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TimelineSliderProps {
  dateRange: { start: Date; end: Date };
  currentDate: Date;
  onDateChange: (date: Date) => void;
  connectionCount: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export type FilterMode = 'cumulative' | 'window';
export type PeriodOption = 'day' | 'week' | 'month';
export type PlaybackSpeed = 0.5 | 1 | 2;

interface DateMarker {
  date: Date;
  label: string;
  position: number; // 0-100 percentage
}

// ============================================================================
// Custom Hook: useTimelineFilter
// ============================================================================

export interface TimelineFilterResult {
  filteredConnections: PrayerConnection[];
  currentDate: Date;
  setDate: (date: Date) => void;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  dateRange: { start: Date; end: Date };
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  period: PeriodOption;
  setPeriod: (period: PeriodOption) => void;
  connectionCount: number;
}

/**
 * useTimelineFilter - Manages timeline state and connection filtering
 *
 * @param connections - All prayer connections
 * @returns Timeline state and control functions
 */
export function useTimelineFilter(connections: PrayerConnection[]): TimelineFilterResult {
  // Calculate date range from connections
  const dateRange = useMemo(() => {
    if (connections.length === 0) {
      const now = new Date();
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return { start: yearAgo, end: now };
    }

    const dates = connections.map(c => new Date(c.createdAt).getTime());
    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));

    return { start, end };
  }, [connections]);

  const [currentDate, setCurrentDate] = useState<Date>(dateRange.end);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [filterMode, setFilterMode] = useState<FilterMode>('cumulative');
  const [period, setPeriod] = useState<PeriodOption>('month');

  // Filter connections based on current date and mode
  const filteredConnections = useMemo(() => {
    const currentTime = currentDate.getTime();

    if (filterMode === 'cumulative') {
      // Show all connections up to current date
      return connections.filter(c =>
        new Date(c.createdAt).getTime() <= currentTime
      );
    } else {
      // Show only connections in the current period window
      const periodMs = getPeriodMilliseconds(period);
      const windowStart = currentTime - periodMs;

      return connections.filter(c => {
        const createdTime = new Date(c.createdAt).getTime();
        return createdTime >= windowStart && createdTime <= currentTime;
      });
    }
  }, [connections, currentDate, filterMode, period]);

  // Playback animation effect
  useEffect(() => {
    if (!isPlaying) return;

    const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
    const stepMs = 100; // Update every 100ms for smooth 10fps updates
    const incrementMs = (totalMs / 100) * playbackSpeed; // Traverse 1% per step

    const interval = setInterval(() => {
      setCurrentDate(prev => {
        const next = new Date(prev.getTime() + incrementMs);

        // Stop at the end
        if (next >= dateRange.end) {
          setIsPlaying(false);
          return dateRange.end;
        }

        return next;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, dateRange]);

  // Control functions
  const play = useCallback(() => {
    // Reset to start if at the end
    if (currentDate >= dateRange.end) {
      setCurrentDate(dateRange.start);
    }
    setIsPlaying(true);
  }, [currentDate, dateRange]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const setDate = useCallback((date: Date) => {
    setCurrentDate(date);
    setIsPlaying(false);
  }, []);

  return {
    filteredConnections,
    currentDate,
    setDate,
    isPlaying,
    play,
    pause,
    dateRange,
    playbackSpeed,
    setPlaybackSpeed,
    filterMode,
    setFilterMode,
    period,
    setPeriod,
    connectionCount: filteredConnections.length,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPeriodMilliseconds(period: PeriodOption): number {
  const day = 24 * 60 * 60 * 1000;

  switch (period) {
    case 'day':
      return day;
    case 'week':
      return day * 7;
    case 'month':
      return day * 30; // Approximate
    default:
      return day * 30;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit'
  });
}

function generateDateMarkers(start: Date, end: Date): DateMarker[] {
  const markers: DateMarker[] = [];
  const totalMs = end.getTime() - start.getTime();

  // Generate monthly markers
  const current = new Date(start);
  current.setDate(1); // Start of month

  while (current <= end) {
    const position = ((current.getTime() - start.getTime()) / totalMs) * 100;

    markers.push({
      date: new Date(current),
      label: formatDateShort(current),
      position: Math.max(0, Math.min(100, position)),
    });

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }

  return markers;
}

// ============================================================================
// TimelineSlider Component
// ============================================================================

export function TimelineSlider({
  dateRange,
  currentDate,
  onDateChange,
  connectionCount,
  isPlaying,
  onPlay,
  onPause,
  playbackSpeed,
  onSpeedChange,
}: TimelineSliderProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('cumulative');
  const [period, setPeriod] = useState<PeriodOption>('month');

  // Calculate slider position (0-100%)
  const sliderPosition = useMemo(() => {
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
    const currentMs = currentDate.getTime() - dateRange.start.getTime();
    return (currentMs / totalMs) * 100;
  }, [currentDate, dateRange]);

  // Generate date markers for the timeline
  const dateMarkers = useMemo(
    () => generateDateMarkers(dateRange.start, dateRange.end),
    [dateRange]
  );

  // Handle slider drag
  const handleSliderDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const container = (event.target as HTMLElement).closest('[data-timeline-track]');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const position = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));

      const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
      const newDate = new Date(dateRange.start.getTime() + (position / 100) * totalMs);

      onDateChange(newDate);
    },
    [dateRange, onDateChange]
  );

  // Handle track click
  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const position = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));

      const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
      const newDate = new Date(dateRange.start.getTime() + (position / 100) * totalMs);

      onDateChange(newDate);
    },
    [dateRange, onDateChange]
  );

  // Playback speed options
  const speedOptions: PlaybackSpeed[] = [0.5, 1, 2];

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ zIndex: 25 }}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="p-4 pb-6 pointer-events-auto">
          {/* Minimized View */}
          {!isExpanded && (
            <motion.button
              onClick={() => setIsExpanded(true)}
              className="glass-strong rounded-full px-6 py-3 mx-auto flex items-center gap-2 shadow-xl hover:shadow-2xl transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Calendar className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-800">
                {formatDate(currentDate)} • {connectionCount} connections
              </span>
              <ChevronUp className="w-4 h-4 text-gray-600" />
            </motion.button>
          )}

          {/* Expanded View */}
          {isExpanded && (
            <motion.div
              className="glass-strong rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setIsExpanded(false);
                }
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-prayer-purple" />
                  <h3 className="text-lg font-semibold text-gray-800">Prayer Timeline</h3>
                  <div className="px-3 py-1 bg-prayer-purple/20 rounded-full">
                    <span className="text-sm font-medium text-gray-700">
                      {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Current Date Display */}
              <div className="mb-4 text-center">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatDate(currentDate)}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
                </div>
              </div>

              {/* Timeline Track */}
              <div className="mb-6">
                <div
                  data-timeline-track
                  className="relative h-3 bg-white/50 rounded-full cursor-pointer overflow-visible"
                  onClick={handleTrackClick}
                >
                  {/* Progress Fill */}
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-dawn-gold via-prayer-purple to-heavenly-blue rounded-full"
                    initial={false}
                    animate={{ width: `${sliderPosition}%` }}
                    transition={{ duration: 0.15 }}
                  />

                  {/* Date Markers */}
                  {dateMarkers.map((marker, idx) => (
                    <div
                      key={idx}
                      className="absolute top-1/2 -translate-y-1/2 w-px h-6 bg-gray-400/50"
                      style={{ left: `${marker.position}%` }}
                    >
                      <span className="absolute top-8 left-1/2 -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                        {marker.label}
                      </span>
                    </div>
                  ))}

                  {/* Slider Handle */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing"
                    style={{ left: `${sliderPosition}%`, marginLeft: '-12px' }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0}
                    dragMomentum={false}
                    onDrag={handleSliderDrag}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 1.1 }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-dawn-gold to-prayer-purple opacity-75" />
                  </motion.div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={isPlaying ? onPause : onPlay}
                    className="p-3 bg-gradient-to-br from-dawn-gold to-prayer-purple rounded-full shadow-lg hover:shadow-xl transition-shadow"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" fill="white" />
                    )}
                  </motion.button>

                  {/* Speed Control */}
                  <div className="flex items-center gap-1 bg-white/50 rounded-full p-1">
                    {speedOptions.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => onSpeedChange(speed)}
                        className={`
                          px-3 py-1 rounded-full text-sm font-medium transition-all
                          ${playbackSpeed === speed
                            ? 'bg-white text-gray-800 shadow-md'
                            : 'text-gray-600 hover:text-gray-800'
                          }
                        `}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Mode Toggle */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <div className="flex items-center gap-1 bg-white/50 rounded-full p-1">
                    <button
                      onClick={() => setFilterMode('cumulative')}
                      className={`
                        px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1
                        ${filterMode === 'cumulative'
                          ? 'bg-white text-gray-800 shadow-md'
                          : 'text-gray-600 hover:text-gray-800'
                        }
                      `}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Cumulative
                    </button>
                    <button
                      onClick={() => setFilterMode('window')}
                      className={`
                        px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1
                        ${filterMode === 'window'
                          ? 'bg-white text-gray-800 shadow-md'
                          : 'text-gray-600 hover:text-gray-800'
                        }
                      `}
                    >
                      <Calendar className="w-3 h-3" />
                      Window
                    </button>
                  </div>
                </div>

                {/* Period Selection (only for window mode) */}
                {filterMode === 'window' && (
                  <div className="flex items-center gap-1 bg-white/50 rounded-full p-1">
                    {(['day', 'week', 'month'] as PeriodOption[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`
                          px-3 py-1 rounded-full text-sm font-medium capitalize transition-all
                          ${period === p
                            ? 'bg-white text-gray-800 shadow-md'
                            : 'text-gray-600 hover:text-gray-800'
                          }
                        `}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
