import { motion } from 'framer-motion';
import { X, Bookmark, Loader2, Mic, Video } from 'lucide-react';
import { useSavedPrayers } from '../hooks/useSavedPrayers';
import { useAuth } from '../../authentication/contexts/AuthContext';
import type { Prayer } from '../types/prayer';
import { PRAYER_CATEGORIES } from '../types/prayer';

interface SavedPrayersModalProps {
  onClose: () => void;
  onSelectPrayer: (prayer: Prayer) => void;
}

export function SavedPrayersModal({ onClose, onSelectPrayer }: SavedPrayersModalProps) {
  const { user } = useAuth();
  const { savedPrayers, loading, unsavePrayer } = useSavedPrayers(user?.id);

  // Format relative time
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-xl">
              <Bookmark className="w-5 h-5 text-yellow-600 fill-yellow-500" />
            </div>
            <h3 className="text-gray-800 dark:text-white text-lg font-semibold">
              Saved Prayers
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-black/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : savedPrayers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Bookmark className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                No saved prayers yet
              </p>
              <p className="text-sm text-gray-500 mt-2 max-w-[250px] mx-auto">
                Tap the bookmark icon on prayers to save them for later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPrayers.map(prayer => {
                // Get category info
                const categoryInfo = PRAYER_CATEGORIES.find(c => c.id === prayer.category);
                
                return (
                  <motion.div
                    key={prayer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-4 cursor-pointer hover:bg-white/50 transition-all active:scale-[0.98]"
                    onClick={() => {
                      onSelectPrayer(prayer);
                      onClose();
                    }}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Category badge and content type */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {categoryInfo && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <span>{categoryInfo.emoji}</span>
                              <span>{categoryInfo.label}</span>
                            </span>
                          )}
                          {prayer.content_type === 'audio' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-600">
                              <Mic className="w-3 h-3" />
                              <span>Audio</span>
                            </span>
                          )}
                          {prayer.content_type === 'video' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                              <Video className="w-3 h-3" />
                              <span>Video</span>
                            </span>
                          )}
                        </div>

                        {/* Title or content preview */}
                        {prayer.title ? (
                          <>
                            <h4 className="text-gray-800 dark:text-white font-medium truncate">
                              {prayer.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                              {prayer.content_type === 'audio' 
                                ? '🎤 Audio prayer' 
                                : prayer.content_type === 'video'
                                  ? '🎥 Video prayer'
                                  : prayer.content}
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-800 dark:text-white line-clamp-3">
                            {prayer.content_type === 'audio' 
                              ? '🎤 Audio prayer' 
                              : prayer.content_type === 'video'
                                ? '🎥 Video prayer'
                                : prayer.content}
                          </p>
                        )}

                        {/* Time ago */}
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTimeAgo(prayer.created_at)}
                        </p>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          unsavePrayer(prayer.id);
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors flex-shrink-0"
                        aria-label="Remove from saved"
                      >
                        <X className="w-4 h-4 text-red-400 hover:text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with count */}
        {savedPrayers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200/50">
            <p className="text-sm text-gray-500 text-center">
              {savedPrayers.length} saved prayer{savedPrayers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

