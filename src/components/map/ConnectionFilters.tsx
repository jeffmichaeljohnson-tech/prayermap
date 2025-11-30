/**
 * ConnectionFilters - Memorial lines filter panel
 *
 * Handles:
 * - Time range filtering (all time, year, month, week, today)
 * - Response type filtering (text, audio, video, all)
 * - Distance range filtering (local, regional, long-distance, all)
 * - Personal connection filtering (show only mine vs all)
 * - Visual options (density overlay, statistics, animations, tooltips)
 * - Persistent preferences via localStorage
 * - Mobile-responsive (bottom sheet on mobile, side panel on desktop)
 * - Glassmorphic design with smooth animations
 *
 * Export:
 * - ConnectionFilters component
 * - useConnectionFilters hook
 * - filterConnections helper function
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Switch } from '../ui/switch';
import { cn } from '../ui/utils';
import type { PrayerConnection } from '../../types/prayer';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionFilterState {
  timeRange: 'all' | 'year' | 'month' | 'week' | 'today';
  responseType: 'all' | 'text' | 'audio' | 'video';
  distanceRange: 'all' | 'local' | 'regional' | 'long';
  showOnlyMine: boolean;
  showDensity: boolean;
  showStats: boolean;
  animateNew: boolean;
  showTooltips: boolean;
}

export interface ConnectionFiltersProps {
  filters: ConnectionFilterState;
  onChange: (filters: ConnectionFilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'prayermap_connection_filters';

const DEFAULT_FILTERS: ConnectionFilterState = {
  timeRange: 'all',
  responseType: 'all',
  distanceRange: 'all',
  showOnlyMine: false,
  showDensity: true,
  showStats: true,
  animateNew: true,
  showTooltips: true,
};

const TIME_RANGES = [
  { value: 'all' as const, label: 'All Time' },
  { value: 'year' as const, label: 'Past Year' },
  { value: 'month' as const, label: 'Past Month' },
  { value: 'week' as const, label: 'Past Week' },
  { value: 'today' as const, label: 'Today' },
];

const RESPONSE_TYPES = [
  { value: 'all' as const, label: 'All Types' },
  { value: 'text' as const, label: 'Text Only' },
  { value: 'audio' as const, label: 'Audio Only' },
  { value: 'video' as const, label: 'Video Only' },
];

const DISTANCE_RANGES = [
  { value: 'all' as const, label: 'All Distances' },
  { value: 'local' as const, label: 'Local (<50mi)' },
  { value: 'regional' as const, label: 'Regional (50-200mi)' },
  { value: 'long' as const, label: 'Long-Distance (200+mi)' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filter connections based on filter state
 */
export function filterConnections(
  connections: PrayerConnection[],
  filters: ConnectionFilterState,
  userId?: string
): PrayerConnection[] {
  return connections.filter((connection) => {
    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const createdAt = new Date(connection.createdAt);
      const diffMs = now.getTime() - createdAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      switch (filters.timeRange) {
        case 'today':
          if (diffDays > 1) return false;
          break;
        case 'week':
          if (diffDays > 7) return false;
          break;
        case 'month':
          if (diffDays > 30) return false;
          break;
        case 'year':
          if (diffDays > 365) return false;
          break;
      }
    }

    // Response type filter
    // Note: PrayerConnection doesn't have responseType in current schema
    // This is a placeholder for when that field is added
    // if (filters.responseType !== 'all') {
    //   if (connection.responseType !== filters.responseType) return false;
    // }

    // Distance range filter
    if (filters.distanceRange !== 'all') {
      const distance = calculateDistance(
        connection.fromLocation.lat,
        connection.fromLocation.lng,
        connection.toLocation.lat,
        connection.toLocation.lng
      );

      switch (filters.distanceRange) {
        case 'local':
          if (distance >= 50) return false;
          break;
        case 'regional':
          if (distance < 50 || distance >= 200) return false;
          break;
        case 'long':
          if (distance < 200) return false;
          break;
      }
    }

    // Show only mine filter
    // Note: Need to determine which connections are "mine"
    // This could be based on userId matching requester or replier
    // if (filters.showOnlyMine && userId) {
    //   if (connection.requesterId !== userId && connection.replierId !== userId) {
    //     return false;
    //   }
    // }

    return true;
  });
}

// ============================================================================
// Custom Hook
// ============================================================================

export function useConnectionFilters() {
  const [filters, setFilters] = useState<ConnectionFilterState>(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load connection filters:', error);
    }
    return DEFAULT_FILTERS;
  });

  // Persist to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save connection filters:', error);
    }
  }, [filters]);

  const setFilter = useCallback(
    <K extends keyof ConnectionFilterState>(
      key: K,
      value: ConnectionFilterState[K]
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const applyFilters = useCallback(
    (connections: PrayerConnection[], userId?: string) => {
      return filterConnections(connections, filters, userId);
    },
    [filters]
  );

  return {
    filters,
    setFilter,
    resetFilters,
    applyFilters,
  };
}

// ============================================================================
// Component
// ============================================================================

export function ConnectionFilters({
  filters,
  onChange,
  isOpen,
  onToggle,
}: ConnectionFiltersProps) {
  const handleFilterChange = <K extends keyof ConnectionFilterState>(
    key: K,
    value: ConnectionFilterState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange(DEFAULT_FILTERS);
  };

  // Determine if on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      {/* Toggle Button (Floating Action Button) */}
      <motion.button
        onClick={onToggle}
        className="absolute bottom-32 left-6 glass-strong rounded-full p-4 shadow-xl hover:shadow-2xl transition-shadow z-40"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle connection filters"
      >
        <SlidersHorizontal className="w-6 h-6 text-gray-700" />
      </motion.button>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={onToggle}
            />

            {/* Panel - Desktop: Side panel, Mobile: Bottom sheet */}
            <motion.div
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className={cn(
                'fixed glass-strong shadow-2xl z-50',
                isMobile
                  ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh]'
                  : 'top-0 right-0 bottom-0 w-[400px] rounded-l-3xl'
              )}
            >
              {/* Mobile: Drag Handle */}
              {isMobile && (
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-display font-semibold text-gray-800">
                    Connection Filters
                  </h2>
                </div>
                <button
                  onClick={onToggle}
                  className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: isMobile ? 'calc(85vh - 120px)' : 'calc(100vh - 120px)' }}>
                {/* Time Range */}
                <FilterSection title="Time Range">
                  <Select
                    value={filters.timeRange}
                    onChange={(value) =>
                      handleFilterChange('timeRange', value as ConnectionFilterState['timeRange'])
                    }
                    options={TIME_RANGES}
                  />
                </FilterSection>

                {/* Response Type */}
                <FilterSection title="Response Type">
                  <Select
                    value={filters.responseType}
                    onChange={(value) =>
                      handleFilterChange('responseType', value as ConnectionFilterState['responseType'])
                    }
                    options={RESPONSE_TYPES}
                  />
                </FilterSection>

                {/* Connection Length */}
                <FilterSection title="Connection Length">
                  <Select
                    value={filters.distanceRange}
                    onChange={(value) =>
                      handleFilterChange('distanceRange', value as ConnectionFilterState['distanceRange'])
                    }
                    options={DISTANCE_RANGES}
                  />
                </FilterSection>

                {/* My Connections */}
                <FilterSection title="My Connections">
                  <ToggleOption
                    label="Show only my connections"
                    checked={filters.showOnlyMine}
                    onChange={(checked) => handleFilterChange('showOnlyMine', checked)}
                  />
                </FilterSection>

                {/* Visual Options Divider */}
                <div className="border-t border-gray-200/50 pt-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                    Visual Options
                  </h3>
                </div>

                {/* Show Density Overlay */}
                <ToggleOption
                  label="Show connection density overlay"
                  description="Display heatmap of prayer connection intensity"
                  checked={filters.showDensity}
                  onChange={(checked) => handleFilterChange('showDensity', checked)}
                />

                {/* Show Statistics */}
                <ToggleOption
                  label="Show statistics panel"
                  description="Display connection metrics and insights"
                  checked={filters.showStats}
                  onChange={(checked) => handleFilterChange('showStats', checked)}
                />

                {/* Animate New Connections */}
                <ToggleOption
                  label="Animate new connections"
                  description="Show entrance animation for new prayer lines"
                  checked={filters.animateNew}
                  onChange={(checked) => handleFilterChange('animateNew', checked)}
                />

                {/* Show Tooltips */}
                <ToggleOption
                  label="Show connection tooltips on hover"
                  description="Display details when hovering over connections"
                  checked={filters.showTooltips}
                  onChange={(checked) => handleFilterChange('showTooltips', checked)}
                />
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200/50">
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200/50 hover:bg-gray-200/70 rounded-xl transition-colors text-gray-700 font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {title}
      </label>
      {children}
    </div>
  );
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function Select({ value, onChange, options }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 glass rounded-xl hover:bg-white/30 transition-colors text-left"
      >
        <span className="text-gray-800">
          {selectedOption?.label || 'Select...'}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-600 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl shadow-xl overflow-hidden z-20"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-white/30 transition-colors',
                    option.value === value
                      ? 'bg-purple-100/50 text-purple-700 font-medium'
                      : 'text-gray-700'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-gray-700 cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="shrink-0"
      />
    </div>
  );
}
