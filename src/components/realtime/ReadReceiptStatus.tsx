import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import { readReceiptService } from '../../services/readReceiptService';
import type { ReadReceipt, ReadReceiptEvent } from '../../services/readReceiptService';

interface ReadReceiptStatusProps {
  messageId: string;
  conversationId: string;
  senderId: string;
  sentAt: Date;
  totalParticipants: number;
  className?: string;
  showTime?: boolean;
  compact?: boolean;
}

export function ReadReceiptStatus({
  messageId,
  conversationId,
  senderId,
  sentAt,
  totalParticipants,
  className = '',
  showTime = true,
  compact = false
}: ReadReceiptStatusProps) {
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial read receipts
    const loadReceipts = async () => {
      try {
        const receipts = await readReceiptService.getMessageReadReceipts(messageId);
        setReadReceipts(receipts);
      } catch (error) {
        console.error('Failed to load read receipts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReceipts();

    // Subscribe to real-time updates
    const unsubscribe = readReceiptService.subscribeToReadReceipts(
      conversationId,
      (event: ReadReceiptEvent) => {
        if (event.type === 'message_read' && event.receipt?.messageId === messageId) {
          setReadReceipts(prev => {
            const existing = prev.find(r => r.userId === event.receipt!.userId);
            if (existing) {
              return prev.map(r => r.userId === event.receipt!.userId ? event.receipt! : r);
            } else {
              return [...prev, event.receipt!];
            }
          });
        }
      }
    );

    return unsubscribe;
  }, [messageId, conversationId]);

  const getStatusDisplay = () => {
    if (isLoading) {
      return { icon: 'check', color: 'text-gray-400', count: 0 };
    }

    const readCount = readReceipts.length;
    const totalReaders = totalParticipants - 1; // Exclude sender

    if (readCount === 0) {
      return { icon: 'check', color: 'text-gray-400', count: 0 };
    } else if (readCount === totalReaders) {
      return { icon: 'double-check', color: 'text-blue-400', count: readCount };
    } else {
      return { icon: 'double-check', color: 'text-gray-400', count: readCount };
    }
  };

  const status = getStatusDisplay();
  const timeDisplay = formatMessageTime(sentAt);

  if (compact) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <StatusIcon icon={status.icon} color={status.color} />
        {showTime && (
          <time className="text-xs text-gray-500">{timeDisplay}</time>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between text-xs ${className}`}>
      <div className="flex items-center space-x-2">
        <StatusIcon icon={status.icon} color={status.color} />
        
        {/* Read count indicator */}
        {status.count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
              status.color.includes('blue') 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {status.count}
          </motion.span>
        )}

        {/* Read by names tooltip trigger */}
        {readReceipts.length > 0 && (
          <ReadByTooltip readReceipts={readReceipts} />
        )}
      </div>

      {/* Timestamp */}
      {showTime && (
        <time className="text-gray-500 ml-2">{timeDisplay}</time>
      )}
    </div>
  );
}

function StatusIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", duration: 0.3 }}
      className={`${color}`}
    >
      {icon === 'check' ? (
        <Check className="w-3 h-3" />
      ) : (
        <CheckCheck className="w-3 h-3" />
      )}
    </motion.div>
  );
}

function ReadByTooltip({ readReceipts }: { readReceipts: ReadReceipt[] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (readReceipts.length === 0) return null;

  const sortedReceipts = [...readReceipts].sort((a, b) => 
    a.readAt.getTime() - b.readAt.getTime()
  );

  return (
    <div className="relative">
      <button
        className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        Read by {readReceipts.length}
      </button>

      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 5 }}
          className="absolute bottom-full left-0 mb-2 z-50"
        >
          <div className="glass-strong rounded-lg p-3 shadow-xl border border-white/20 min-w-[200px]">
            <div className="text-xs font-medium text-gray-700 mb-2">Read by:</div>
            <div className="space-y-1">
              {sortedReceipts.map((receipt) => (
                <div key={receipt.userId} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">{receipt.userName}</span>
                  <span className="text-gray-500">
                    {formatReadTime(receipt.readAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Bulk read indicator for conversations
export function ConversationReadStatus({
  conversationId,
  userId,
  className = ''
}: {
  conversationId: string;
  userId: string;
  className?: string;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await readReceiptService.getUnreadMessageCount(conversationId, userId);
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to load unread count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUnreadCount();

    // Subscribe to conversation updates
    const unsubscribe = readReceiptService.subscribeToReadReceipts(
      conversationId,
      (event: ReadReceiptEvent) => {
        if (event.type === 'conversation_read' && event.userId === userId) {
          setUnreadCount(0);
        } else if (event.type === 'message_read' && event.receipt?.userId === userId) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    );

    return unsubscribe;
  }, [conversationId, userId]);

  if (isLoading || unreadCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold ${className}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </motion.div>
  );
}

// Hook for programmatic read receipt management
export function useReadReceipts(messageId: string, conversationId: string) {
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReceipts = async () => {
      try {
        const receipts = await readReceiptService.getMessageReadReceipts(messageId);
        setReadReceipts(receipts);
      } catch (error) {
        console.error('Failed to load read receipts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReceipts();

    const unsubscribe = readReceiptService.subscribeToReadReceipts(
      conversationId,
      (event: ReadReceiptEvent) => {
        if (event.type === 'message_read' && event.receipt?.messageId === messageId) {
          setReadReceipts(prev => {
            const existing = prev.find(r => r.userId === event.receipt!.userId);
            if (existing) {
              return prev.map(r => r.userId === event.receipt!.userId ? event.receipt! : r);
            } else {
              return [...prev, event.receipt!];
            }
          });
        }
      }
    );

    return unsubscribe;
  }, [messageId, conversationId]);

  return {
    readReceipts,
    isLoading,
    markAsRead: (userId: string, userName: string) =>
      readReceiptService.markMessageRead(messageId, userId, userName),
    isReadByUser: (userId: string) =>
      readReceipts.some(receipt => receipt.userId === userId)
  };
}

// Utility functions
function formatMessageTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString();
}

function formatReadTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString();
}