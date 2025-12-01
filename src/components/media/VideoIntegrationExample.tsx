import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Plus } from 'lucide-react';
import { PrayerVideoFeed } from './PrayerVideoFeed';
import { PrayerVideoRecordModal } from './PrayerVideoRecordModal';
import { PrayerDetailModal } from '../prayer/PrayerDetailModal';
import { useVideoFeed } from '../../hooks/useVideoFeed';
import { usePrayers } from '../../hooks/usePrayers';
import { Button } from '../ui/button';
import type { Prayer } from '../../types/prayer';

interface VideoIntegrationExampleProps {
  userLocation?: { lat: number; lng: number };
  prayers: Prayer[];
}

/**
 * Complete integration example showing how to use the new video features
 * within the existing PrayerMap architecture
 */
export function VideoIntegrationExample({ 
  userLocation = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  prayers 
}: VideoIntegrationExampleProps) {
  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [videoFeedStartIndex, setVideoFeedStartIndex] = useState(0);

  // Use the video feed hook
  const {
    prayers: videoPrayers,
    currentPrayer,
    currentIndex,
    isLoading,
    hasMore,
    error,
    position,
    loadMore,
    goToNext,
    goToPrevious,
    handlePrayForVideo,
    sharePrayer,
    reportPrayer,
    refreshFeed
  } = useVideoFeed({ 
    initialPrayers: prayers,
    userLocation 
  });

  // Use existing prayers hook for creating new prayers
  const { submitPrayer, sendPrayerSupport } = usePrayers(userLocation);

  // Handle opening video feed from a specific prayer
  const handleOpenVideoFeed = useCallback((prayer: Prayer) => {
    const index = videoPrayers.findIndex(p => p.id === prayer.id);
    if (index !== -1) {
      setVideoFeedStartIndex(index);
      setShowVideoFeed(true);
    }
  }, [videoPrayers]);

  // Handle video prayer submission
  const handleVideoSubmit = useCallback(async (data: {
    videoBlob: Blob;
    title: string;
    description: string;
    isAnonymous: boolean;
    category?: string;
    duration: number;
  }) => {
    try {
      // Convert blob to file for upload
      const videoFile = new File([data.videoBlob], 'prayer-video.mp4', {
        type: 'video/mp4'
      });

      await submitPrayer({
        title: data.title,
        content: data.description,
        content_type: 'video',
        content_file: videoFile,
        category: data.category,
        is_anonymous: data.isAnonymous,
        location: userLocation
      });

      // Refresh the feed to include new video
      refreshFeed();
      
      setShowRecordModal(false);
    } catch (error) {
      console.error('Failed to submit video prayer:', error);
    }
  }, [submitPrayer, userLocation, refreshFeed]);

  // Handle praying for a video
  const handlePray = useCallback(async (prayer: Prayer) => {
    const success = await handlePrayForVideo(prayer);
    if (success) {
      // Show success feedback (implement toast notification)
      console.log('Prayer sent successfully!');
    }
  }, [handlePrayForVideo]);

  // Handle prayer detail modal interactions
  const handlePrayerDetailPray = useCallback(async (prayer: Prayer, replyData?: any) => {
    try {
      await sendPrayerSupport(prayer.id, replyData || {
        message: 'Praying for you! 🙏',
        contentType: 'text',
        isAnonymous: false
      });
      
      setSelectedPrayer(null);
    } catch (error) {
      console.error('Failed to send prayer support:', error);
    }
  }, [sendPrayerSupport]);

  return (
    <div className="relative w-full h-full">
      {/* Main Interface - Example buttons and video grid */}
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Video Prayer Features
          </h2>
          <p className="text-gray-600 mb-6">
            Experience prayer in a whole new way with our social media-inspired video features
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => setShowRecordModal(true)}
            className="bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white px-6 py-3 rounded-full flex items-center gap-2"
          >
            <Video className="w-5 h-5" />
            Record Prayer Video
          </Button>

          <Button
            onClick={() => setShowVideoFeed(true)}
            disabled={videoPrayers.length === 0}
            className="bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white px-6 py-3 rounded-full flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Browse Video Prayers ({videoPrayers.length})
          </Button>
        </div>

        {/* Video Prayer Grid Preview */}
        {videoPrayers.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Video Prayers</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videoPrayers.slice(0, 8).map((prayer, index) => (
                <motion.div
                  key={prayer.id}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 cursor-pointer group"
                  onClick={() => {
                    setVideoFeedStartIndex(index);
                    setShowVideoFeed(true);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {prayer.content_url ? (
                    <video
                      src={prayer.content_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                      <Video className="w-8 h-8 text-white/70" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Prayer Info */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-medium line-clamp-2 mb-1">
                      {prayer.title || 'Prayer Request'}
                    </p>
                    <p className="text-white/70 text-xs">
                      {prayer.is_anonymous ? 'Anonymous' : prayer.user_name || 'Anonymous'}
                    </p>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        className="w-6 h-6 text-white"
                      >
                        ▶️
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {videoPrayers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎥</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Video Prayers Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to share a video prayer with your community
            </p>
            <Button
              onClick={() => setShowRecordModal(true)}
              className="bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 px-6 py-3 rounded-full"
            >
              Record First Video Prayer
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-gray-300 border-t-purple-500 rounded-full mx-auto mb-4"
            />
            <p className="text-gray-600">Loading video prayers...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={refreshFeed}
              className="glass hover:bg-gray-100 text-gray-700"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Video Recording Modal */}
      <AnimatePresence>
        {showRecordModal && (
          <PrayerVideoRecordModal
            isOpen={showRecordModal}
            onClose={() => setShowRecordModal(false)}
            onSubmit={handleVideoSubmit}
            maxDuration={90}
          />
        )}
      </AnimatePresence>

      {/* Full-Screen Video Feed */}
      <AnimatePresence>
        {showVideoFeed && videoPrayers.length > 0 && (
          <PrayerVideoFeed
            prayers={videoPrayers}
            initialIndex={videoFeedStartIndex}
            userLocation={userLocation}
            onClose={() => setShowVideoFeed(false)}
            onPray={handlePray}
            onShare={sharePrayer}
            onReport={reportPrayer}
            onLoadMore={loadMore}
          />
        )}
      </AnimatePresence>

      {/* Prayer Detail Modal (for integration with existing modal) */}
      <AnimatePresence>
        {selectedPrayer && (
          <PrayerDetailModal
            prayer={selectedPrayer}
            userLocation={userLocation}
            onClose={() => setSelectedPrayer(null)}
            onPray={handlePrayerDetailPray}
            onOpenVideoFeed={handleOpenVideoFeed}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Usage Example:
/*
import { VideoIntegrationExample } from './components/VideoIntegrationExample';

function App() {
  const { prayers, userLocation } = usePrayers();
  
  return (
    <VideoIntegrationExample 
      prayers={prayers}
      userLocation={userLocation}
    />
  );
}
*/