/**
 * ModerationStatus Component
 *
 * Shows the current moderation status of content
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

export interface ModerationStatusProps {
  status: 'pending' | 'moderating' | 'approved' | 'rejected';
  message?: string;
  className?: string;
}

export function ModerationStatus({
  status,
  message,
  className = ''
}: ModerationStatusProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-2 ${className}`}
      >
        {status === 'pending' && (
          <>
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">Waiting for review...</span>
          </>
        )}

        {status === 'moderating' && (
          <>
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm text-blue-600">Reviewing content...</span>
          </>
        )}

        {status === 'approved' && (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600">Published</span>
          </>
        )}

        {status === 'rejected' && (
          <>
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">
              {message || 'Content not approved'}
            </span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Inline moderation indicator (smaller, for lists)
 */
export function ModerationBadge({
  status
}: {
  status: 'pending' | 'approved' | 'rejected'
}) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected'
  };

  return (
    <span className={`
      inline-flex items-center px-2 py-0.5
      rounded-full text-xs font-medium
      ${styles[status]}
    `}>
      {labels[status]}
    </span>
  );
}
