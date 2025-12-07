import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Mic, Video, Loader2 } from 'lucide-react';
import type { Prayer } from '../types/prayer';
import { PRAYER_CATEGORIES, type PrayerCategory } from '../types/prayer';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { AudioRecorder } from '../../media/components/AudioRecorder';
import { FullscreenVideoRecorder } from '../../media/components/FullScreenVideoRecorder';
import { uploadAudio, uploadVideo } from '../../media/services/storageService';
import { useAuth } from '../../authentication/hooks/useAuth';
import { formatDuration } from '../../media/hooks/useAudioRecorder';

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
  const [category, setCategory] = useState<PrayerCategory>('request');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);

  const handleAudioRecordingComplete = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
    setContent(`Audio prayer (${formatDuration(duration)})`);
    setUploadError(null);
  };

  const handleVideoRecordingComplete = (blob: Blob, duration: number, _thumbnailUrl: string | null) => {
    setVideoBlob(blob);
    setVideoDuration(duration);
    setContent(`Video prayer (${formatDuration(duration)})`);
    setUploadError(null);
    setShowFullscreenVideo(false);
  };

  const handleVideoCancel = () => {
    setShowFullscreenVideo(false);
    // Reset to text if no video was recorded
    if (!videoBlob) {
      setContentType('text');
    }
  };

  const handleSubmit = async () => {
    // For text prayers
    if (contentType === 'text') {
      if (!content.trim()) return;
      onSubmit({
        title: title.trim() || undefined,
        content: content.trim(),
        content_type: contentType,
        category,
        location: userLocation,
        is_anonymous: isAnonymous
      });
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
          category,
          location: userLocation,
          is_anonymous: isAnonymous
        });
      } catch (error) {
        console.error('Error uploading audio:', error);
        setUploadError('Failed to upload audio. Please try again.');
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
          content: `Video prayer (${formatDuration(videoDuration)})`,
          content_type: 'video',
          content_url: videoUrl,
          category,
          location: userLocation,
          is_anonymous: isAnonymous
        });
      } catch (error) {
        console.error('Error uploading video:', error);
        setUploadError('Failed to upload video. Please try again.');
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

    // Immediately show fullscreen recorder when video is selected
    if (type === 'video') {
      setShowFullscreenVideo(true);
    }
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
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-on-gradient'
                : 'glass hover:glass-strong'
            }`}
          >
            {contentType === 'text' && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,215,0,0.4), rgba(255,192,203,0.4), rgba(147,112,219,0.4), rgba(135,206,250,0.4), rgba(255,215,0,0.4))',
                  backgroundSize: '300% 300%',
                  padding: '2px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  opacity: 0.6
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            )}
            <Type className={`w-5 h-5 ${contentType === 'text' ? 'text-on-gradient' : 'text-gray-700'}`} />
            <span className={`text-sm ${contentType === 'text' ? 'text-on-gradient' : 'text-gray-700'}`}>Text</span>
          </button>

          <button
            onClick={() => handleContentTypeChange('audio')}
            className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              contentType === 'audio'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-on-gradient'
                : 'glass hover:glass-strong'
            }`}
          >
            {contentType === 'audio' && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,215,0,0.4), rgba(255,192,203,0.4), rgba(147,112,219,0.4), rgba(135,206,250,0.4), rgba(255,215,0,0.4))',
                  backgroundSize: '300% 300%',
                  padding: '2px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  opacity: 0.6
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            )}
            <Mic className={`w-5 h-5 ${contentType === 'audio' ? 'text-on-gradient' : 'text-gray-700'}`} />
            <span className={`text-sm ${contentType === 'audio' ? 'text-on-gradient' : 'text-gray-700'}`}>Audio</span>
          </button>

          <button
            onClick={() => handleContentTypeChange('video')}
            className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              contentType === 'video'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-on-gradient'
                : 'glass hover:glass-strong'
            }`}
          >
            {contentType === 'video' && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,215,0,0.4), rgba(255,192,203,0.4), rgba(147,112,219,0.4), rgba(135,206,250,0.4), rgba(255,215,0,0.4))',
                  backgroundSize: '300% 300%',
                  padding: '2px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  opacity: 0.6
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            )}
            <Video className={`w-5 h-5 ${contentType === 'video' ? 'text-on-gradient' : 'text-gray-700'}`} />
            <span className={`text-sm ${contentType === 'video' ? 'text-on-gradient' : 'text-gray-700'}`}>Video</span>
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

          {/* Category Selector */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRAYER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all ${
                    category === cat.id
                      ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-on-gradient ring-2 ring-purple-300'
                      : 'glass text-gray-600 hover:glass-strong'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {contentType === 'text' && (
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Prayer Request
              </label>
              <Textarea
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
              <AudioRecorder
                onRecordingComplete={handleAudioRecordingComplete}
                maxDuration={120}
              />
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
              {videoBlob ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                    <Video className="w-5 h-5" />
                    <span className="text-sm font-medium">Recording ready ({formatDuration(videoDuration)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullscreenVideo(true)}
                    className="text-sm text-purple-600 hover:text-purple-700 underline"
                  >
                    Re-record video
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-500">Tap Video above to record</p>
                </div>
              )}
              {uploadError && (
                <p className="text-sm text-red-500 mt-3 text-center">{uploadError}</p>
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

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-on-gradient rounded-full py-8 text-lg font-semibold disabled:opacity-50"
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

      {/* Fullscreen Video Recorder */}
      <AnimatePresence>
        {showFullscreenVideo && (
          <FullscreenVideoRecorder
            onRecordingComplete={handleVideoRecordingComplete}
            onCancel={handleVideoCancel}
            maxDuration={60}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}