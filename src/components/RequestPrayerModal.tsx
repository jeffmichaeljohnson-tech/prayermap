import { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { X, Type, Mic, Video, Loader2, AlertCircle } from 'lucide-react';
import type { Prayer } from '../types/prayer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { uploadAudio, uploadVideo } from '../services/storageService';
import { useAuth } from '../hooks/useAuth';
import { formatDuration } from '../hooks/useAudioRecorder';
import { formatVideoDuration } from '../hooks/useVideoRecorder';
import { validators } from '../lib/security';

// CODE SPLITTING: Lazy-load heavy recording components
// Only loaded when user chooses to record audio/video
const AudioRecorder = lazy(() =>
  import('./AudioRecorder').then(m => ({ default: m.AudioRecorder }))
);
const VideoRecorder = lazy(() =>
  import('./VideoRecorder').then(m => ({ default: m.VideoRecorder }))
);

// Loading component for recorders
const RecorderLoader = () => (
  <div className="glass rounded-xl p-6 text-center">
    <div className="animate-pulse text-gray-600">Loading recorder...</div>
  </div>
);

interface RequestPrayerModalProps {
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  onSubmit: (prayer: Omit<Prayer, 'id' | 'createdAt' | 'prayedBy'>) => void;
}

export function RequestPrayerModal({ userLocation, onClose, onSubmit }: RequestPrayerModalProps) {
  const { user } = useAuth();
  const [contentType, setContentType] = useState<'text' | 'audio' | 'video'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleAudioRecordingComplete = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
    setContent(`Audio prayer (${formatDuration(duration)})`);
    setUploadError(null);
  };

  const handleVideoRecordingComplete = (blob: Blob, duration: number) => {
    setVideoBlob(blob);
    setVideoDuration(duration);
    setContent(`Video prayer (${formatVideoDuration(duration)})`);
    setUploadError(null);
  };

  const handleSubmit = async () => {
    setUploadError(null);
    setIsUploading(true);

    // Validate title if provided
    if (title.trim() && title.length > 200) {
      setUploadError('Title must be less than 200 characters');
      setIsUploading(false);
      return;
    }

    // For text prayers
    if (contentType === 'text') {
      if (!content.trim()) {
        setUploadError('Please enter your prayer request');
        setIsUploading(false);
        return;
      }

      // Validate content
      const contentValidation = validators.prayerContent(content.trim());
      if (!contentValidation.valid) {
        setUploadError(contentValidation.errors[0]);
        setIsUploading(false);
        return;
      }

      // Validate location
      if (!validators.coordinates(userLocation.lat, userLocation.lng)) {
        setUploadError('Invalid location. Please try again.');
        setIsUploading(false);
        return;
      }

      try {
        onSubmit({
          title: title.trim() || undefined,
          content: content.trim(),
          content_type: contentType,
          location: userLocation,
          is_anonymous: isAnonymous
        });
        // Note: Modal will close when onSubmit completes successfully in parent
      } catch (error) {
        console.error('Error submitting prayer:', error);
        setUploadError('Failed to submit prayer. Please try again.');
        setIsUploading(false);
      }
      return;
    }

    // For audio prayers
    if (contentType === 'audio' && audioBlob) {
      setIsUploading(true);
      setUploadError(null);

      try {
        const userId = user?.id || 'anonymous';
        const audioUrl = await uploadAudio(audioBlob, userId);

        if (!audioUrl) {
          setUploadError('Failed to upload audio. Please try again.');
          setIsUploading(false);
          return;
        }

        onSubmit({
          title: title.trim() || undefined,
          content: `Audio prayer (${formatDuration(audioDuration)})`,
          content_type: 'audio',
          content_url: audioUrl,
          location: userLocation,
          is_anonymous: isAnonymous
        });
      } catch (error) {
        console.error('Error uploading audio:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload audio';
        setUploadError(errorMessage);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // For video prayers
    if (contentType === 'video' && videoBlob) {
      setIsUploading(true);
      setUploadError(null);

      try {
        const userId = user?.id || 'anonymous';
        const videoUrl = await uploadVideo(videoBlob, userId);

        if (!videoUrl) {
          setUploadError('Failed to upload video. Please try again.');
          setIsUploading(false);
          return;
        }

        onSubmit({
          title: title.trim() || undefined,
          content: `Video prayer (${formatVideoDuration(videoDuration)})`,
          content_type: 'video',
          content_url: videoUrl,
          location: userLocation,
          is_anonymous: isAnonymous
        });
      } catch (error) {
        console.error('Error uploading video:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
        setUploadError(errorMessage);
      } finally {
        setIsUploading(false);
      }
      return;
    }
  };

  const canSubmit = () => {
    if (isUploading) return false;
    if (contentType === 'text') return content.trim().length > 0;
    if (contentType === 'audio') return audioBlob !== null;
    if (contentType === 'video') return videoBlob !== null;
    return false;
  };

  // Reset media when switching content types
  const handleContentTypeChange = (type: 'text' | 'audio' | 'video') => {
    setContentType(type);
    if (type !== 'audio') {
      setAudioBlob(null);
      setAudioDuration(0);
    }
    if (type !== 'video') {
      setVideoBlob(null);
      setVideoDuration(0);
    }
    if (type !== 'text') {
      setContent('');
    }
    setUploadError(null);
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
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-white/80 via-white/70 to-purple-50/60 backdrop-blur-2xl rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/60 shadow-xl shadow-purple-200/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🙏</span>
            <h3 className="text-gray-800">Request Prayer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content Type Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleContentTypeChange('text')}
            className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              contentType === 'text'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300'
                : 'glass hover:glass-strong'
            }`}
          >
            {contentType === 'text' && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none border-2 border-blue-400/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
            <Type className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700">Text</span>
          </button>
          
          <button
            onClick={() => handleContentTypeChange('audio')}
            className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              contentType === 'audio'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300'
                : 'glass hover:glass-strong'
            }`}
          >
            {contentType === 'audio' && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none border-2 border-blue-400/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
            <Mic className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700">Audio</span>
          </button>
          
          <button
            onClick={() => handleContentTypeChange('video')}
            className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              contentType === 'video'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300'
                : 'glass hover:glass-strong'
            }`}
          >
            {contentType === 'video' && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none border-2 border-blue-400/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
            <Video className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700">Video</span>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Title (optional)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Health and healing"
              className="glass border-white/30 text-gray-800 placeholder:text-gray-500"
            />
          </div>

          {contentType === 'text' && (
            <div>
              <label htmlFor="prayer-request-textarea" className="block text-sm text-gray-700 mb-2">
                Prayer Request
              </label>
              <Textarea
                id="prayer-request-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share what's on your heart..."
                rows={4}
                className="glass border-white/30 text-gray-800 placeholder:text-gray-500 resize-none"
              />
            </div>
          )}

          {contentType === 'audio' && (
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-700 mb-4 text-center">Record your prayer request</p>
              <Suspense fallback={<RecorderLoader />}>
                <AudioRecorder
                  onRecordingComplete={handleAudioRecordingComplete}
                  maxDuration={120}
                />
              </Suspense>
              {uploadError && (
                <p className="text-sm text-red-500 mt-3 text-center">{uploadError}</p>
              )}
              {audioBlob && (
                <p className="text-sm text-green-600 mt-3 text-center">
                  Recording ready ({formatDuration(audioDuration)})
                </p>
              )}
            </div>
          )}

          {contentType === 'video' && (
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-700 mb-4 text-center">Record your video prayer</p>
              <Suspense fallback={<RecorderLoader />}>
                <VideoRecorder
                  onRecordingComplete={handleVideoRecordingComplete}
                  maxDuration={90}
                />
              </Suspense>
              {uploadError && (
                <p className="text-sm text-red-500 mt-3 text-center">{uploadError}</p>
              )}
              {videoBlob && (
                <p className="text-sm text-green-600 mt-3 text-center">
                  Recording ready ({formatVideoDuration(videoDuration)})
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div>
              <p className="text-sm text-gray-700">Post anonymously</p>
              <p className="text-xs text-gray-600">Hide your identity</p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

        </div>

        {/* Error Display */}
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          </motion.div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-8 text-lg font-semibold disabled:opacity-50"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </span>
          ) : (
            'Add to Map'
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}