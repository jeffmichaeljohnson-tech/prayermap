import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, Heart, Moon, Wifi } from 'lucide-react';
import { 
  PresenceStatus, 
  presenceService 
} from '../../services/presenceService';
import type { UserPresence, PresenceEvent } from '../../services/presenceService';

interface PresenceIndicatorProps {
  userId: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  realTimeUpdates?: boolean;
}

export function PresenceIndicator({
  userId,
  showLabel = false,
  size = 'md',
  className = '',
  realTimeUpdates = true
}: PresenceIndicatorProps) {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial presence
    const loadPresence = async () => {
      try {
        const userPresence = await presenceService.getUserPresence(userId);
        setPresence(userPresence);
      } catch (error) {
        console.error('Failed to load user presence:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPresence();

    // Subscribe to real-time updates
    let unsubscribe: (() => void) | undefined;
    
    if (realTimeUpdates) {
      unsubscribe = presenceService.subscribeToPresenceUpdates(
        (event: PresenceEvent) => {
          if (event.presence.userId === userId) {
            setPresence(event.presence);
          }
        },
        [userId]
      );
    }

    return () => unsubscribe?.();
  }, [userId, realTimeUpdates]);

  if (isLoading) {
    return <SkeletonPresenceIndicator size={size} className={className} />;
  }

  if (!presence) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const containerClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2'
  };

  return (
    <div className={`flex items-center ${containerClasses[size]} ${className}`}>
      <PresenceStatusDot 
        status={presence.status}
        size={sizeClasses[size]}
        isPrayingFor={presence.isPrayingFor}
      />
      
      {showLabel && (
        <span className="text-xs text-gray-600">
          {presenceService.getPresenceDisplayText(presence)}
        </span>
      )}
    </div>
  );
}

function PresenceStatusDot({ 
  status, 
  size, 
  isPrayingFor 
}: { 
  status: PresenceStatus; 
  size: string;
  isPrayingFor?: string[];
}) {
  const getStatusProps = () => {
    switch (status) {
      case PresenceStatus.ONLINE:
        return {
          color: 'bg-green-400',
          icon: Wifi,
          animate: { scale: [1, 1.1, 1] },
          transition: { duration: 2, repeat: Infinity }
        };
      case PresenceStatus.PRAYING:
        return {
          color: 'bg-purple-400',
          icon: Heart,
          animate: { 
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8]
          },
          transition: { duration: 1.5, repeat: Infinity }
        };
      case PresenceStatus.AWAY:
        return {
          color: 'bg-yellow-400',
          icon: Moon,
          animate: { opacity: [0.5, 1, 0.5] },
          transition: { duration: 3, repeat: Infinity }
        };
      case PresenceStatus.OFFLINE:
      default:
        return {
          color: 'bg-gray-400',
          icon: Circle,
          animate: {},
          transition: {}
        };
    }
  };

  const { color, icon: Icon, animate, transition } = getStatusProps();

  return (
    <div className="relative">
      <motion.div
        className={`${size} ${color} rounded-full flex items-center justify-center`}
        animate={animate}
        transition={transition}
      >
        {status === PresenceStatus.PRAYING && (
          <Icon className="w-2 h-2 text-white" />
        )}
      </motion.div>

      {/* Prayer activity indicator */}
      {status === PresenceStatus.PRAYING && isPrayingFor && isPrayingFor.length > 0 && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-pink-400 rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 1.2, 1] }}
          transition={{ duration: 0.5 }}
        />
      )}
    </div>
  );
}

// Multi-user presence display for conversations
export function ConversationPresence({
  conversationId,
  participantIds,
  maxShown = 5,
  className = ''
}: {
  conversationId: string;
  participantIds: string[];
  maxShown?: number;
  className?: string;
}) {
  const [presences, setPresences] = useState<Map<string, UserPresence>>(new Map());

  useEffect(() => {
    // Load initial presences
    const loadPresences = async () => {
      const presenceMap = new Map<string, UserPresence>();
      
      await Promise.all(
        participantIds.map(async (userId) => {
          try {
            const presence = await presenceService.getUserPresence(userId);
            if (presence) {
              presenceMap.set(userId, presence);
            }
          } catch (error) {
            console.error(`Failed to load presence for user ${userId}:`, error);
          }
        })
      );
      
      setPresences(presenceMap);
    };

    loadPresences();

    // Subscribe to updates
    const unsubscribe = presenceService.subscribeToPresenceUpdates(
      (event: PresenceEvent) => {
        if (participantIds.includes(event.presence.userId)) {
          setPresences(prev => new Map(prev.set(event.presence.userId, event.presence)));
        }
      },
      participantIds
    );

    return unsubscribe;
  }, [participantIds]);

  const activePresences = Array.from(presences.values())
    .filter(p => p.status !== PresenceStatus.OFFLINE)
    .sort((a, b) => {
      // Sort by status priority: praying > online > away
      const priority = { praying: 3, online: 2, away: 1, offline: 0 };
      return (priority[b.status as keyof typeof priority] || 0) - 
             (priority[a.status as keyof typeof priority] || 0);
    });

  const displayPresences = activePresences.slice(0, maxShown);
  const hiddenCount = Math.max(0, activePresences.length - maxShown);

  if (displayPresences.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Stack of presence indicators */}
      <div className="flex -space-x-1">
        {displayPresences.map((presence, index) => (
          <motion.div
            key={presence.userId}
            initial={{ scale: 0, x: -10 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
            style={{ zIndex: displayPresences.length - index }}
          >
            <div className="w-6 h-6 rounded-full glass-strong border-2 border-white flex items-center justify-center">
              <PresenceStatusDot 
                status={presence.status}
                size="w-3 h-3"
                isPrayingFor={presence.isPrayingFor}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hidden count */}
      {hiddenCount > 0 && (
        <span className="text-xs text-gray-500 ml-2">
          +{hiddenCount} online
        </span>
      )}

      {/* Status summary */}
      <ConversationPresenceSummary presences={activePresences} />
    </div>
  );
}

function ConversationPresenceSummary({ presences }: { presences: UserPresence[] }) {
  const prayingCount = presences.filter(p => p.status === PresenceStatus.PRAYING).length;
  const onlineCount = presences.filter(p => p.status === PresenceStatus.ONLINE).length;
  
  if (prayingCount > 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-purple-600 font-medium"
      >
        {prayingCount} praying 🙏
      </motion.div>
    );
  }

  if (onlineCount > 0) {
    return (
      <span className="text-xs text-green-600">
        {onlineCount} online
      </span>
    );
  }

  return null;
}

// Global presence stats component
export function GlobalPresenceStats({ 
  refreshInterval = 30000,
  className = ''
}: { 
  refreshInterval?: number;
  className?: string;
}) {
  const [stats, setStats] = useState({
    onlineCount: 0,
    prayingCount: 0,
    awayCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const onlineStats = await presenceService.getOnlineStats();
        setStats(onlineStats);
      } catch (error) {
        console.error('Failed to load presence stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    const interval = setInterval(loadStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (isLoading) {
    return <div className={`animate-pulse glass rounded-lg h-16 ${className}`} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Community Activity</h3>
        <div className="flex items-center space-x-3 text-sm">
          {stats.prayingCount > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-purple-600 font-medium">
                {stats.prayingCount} praying
              </span>
            </div>
          )}
          
          {stats.onlineCount > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-green-600">
                {stats.onlineCount} online
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Skeleton loading state
function SkeletonPresenceIndicator({ 
  size, 
  className 
}: { 
  size: 'sm' | 'md' | 'lg'; 
  className: string;
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse ${className}`} />
  );
}

// Hook for programmatic presence management
export function usePresence(userId?: string) {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadPresence = async () => {
      try {
        const userPresence = await presenceService.getUserPresence(userId);
        setPresence(userPresence);
      } catch (error) {
        console.error('Failed to load presence:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPresence();

    const unsubscribe = presenceService.subscribeToPresenceUpdates(
      (event: PresenceEvent) => {
        if (event.presence.userId === userId) {
          setPresence(event.presence);
        }
      },
      [userId]
    );

    return unsubscribe;
  }, [userId]);

  return {
    presence,
    isLoading,
    isOnline: presence?.status === PresenceStatus.ONLINE || presence?.status === PresenceStatus.PRAYING,
    isPraying: presence?.status === PresenceStatus.PRAYING,
    displayText: presence ? presenceService.getPresenceDisplayText(presence) : 'Offline',
    updatePresence: (status: PresenceStatus, customStatus?: string, isPrayingFor?: string[]) =>
      userId ? presenceService.updateUserPresence(userId, status, customStatus, isPrayingFor) : Promise.resolve({} as UserPresence),
    setPrayingStatus: (prayerIds: string[], customStatus?: string) =>
      userId ? presenceService.setPrayingStatus(userId, prayerIds, customStatus) : Promise.resolve()
  };
}