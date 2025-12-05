import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Type, Mic, Video, Heart } from 'lucide-react';
import type { Prayer } from '../types/prayer';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { AudioPlayer } from '../../media/components/AudioPlayer';
import { AudioRecorder } from '../../media/components/AudioRecorder';

interface PrayerDetailModalProps {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  onPray: (prayer: Prayer) => void;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function PrayerDetailModal({ prayer, userLocation, onClose, onPray }: PrayerDetailModalProps) {
  const [isPraying, setIsPraying] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [replyType, setReplyType] = useState<'text' | 'audio' | 'video'>(
    // Default to audio reply for audio prayers (natural response)
    prayer.content_type === 'audio' ? 'audio' : 'text'
  );
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [replyAudioBlob, setReplyAudioBlob] = useState<Blob | null>(null);

  const isAudioPrayer = prayer.content_type === 'audio' && prayer.content_url;

  const handleReplyTypeClick = (type: 'text' | 'audio' | 'video') => {
    setReplyType(type);
    setShowReplyForm(true);
  };

  const handlePray = () => {
    setIsPraying(true);
    setShowSpotlight(true);

    setTimeout(() => {
      onPray(prayer);
    }, 2500);
  };

  const handleQuickPray = useCallback(() => {
    // Quick one-touch prayer response
    setIsPraying(true);
    setShowSpotlight(true);

    setTimeout(() => {
      onPray(prayer);
    }, 2500);
  }, [prayer, onPray]);

  const handleAudioEnded = useCallback(() => {
    setAudioFinished(true);
  }, []);

  const handleReplyAudioComplete = useCallback((blob: Blob, _duration: number) => {
    setReplyAudioBlob(blob);
    setReplyContent('Audio response recorded');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative"
      >
        {/* Spotlight Animation */}
        <AnimatePresence>
          {showSpotlight && (
            <>
              <motion.div
                className="absolute left-1/4 bottom-0 w-24 h-full bg-gradient-to-t from-yellow-300/60 via-yellow-200/40 to-transparent pointer-events-none"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
              <motion.div
                className="absolute right-1/4 bottom-0 w-24 h-full bg-gradient-to-t from-purple-300/60 via-purple-200/40 to-transparent pointer-events-none"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🙏</span>
            <div>
              <h3 className="text-gray-800">
                {prayer.is_anonymous ? 'Anonymous' : prayer.user_name || 'Anonymous'}
              </h3>
              <p className="text-sm text-gray-600">
                {calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  prayer.location.lat,
                  prayer.location.lng
                ).toFixed(1)} miles away
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          {prayer.title && (
            <h4 className="text-gray-800 mb-3 text-lg">{prayer.title}</h4>
          )}

          {/* Text Prayer */}
          {prayer.content_type === 'text' && (
            <p className="text-gray-700 leading-relaxed font-[Inter]">{prayer.content}</p>
          )}

          {/* Audio Prayer - with beautiful player */}
          {isAudioPrayer && (
            <div className="space-y-4">
              <AudioPlayer
                src={prayer.content_url!}
                autoPlay={true}
                onEnded={handleAudioEnded}
              />

              {/* Quick Response Button - appears after audio plays or immediately */}
              <AnimatePresence>
                {!isPraying && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: audioFinished ? 0 : 0.5 }}
                  >
                    <motion.button
                      onClick={handleQuickPray}
                      className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-3 group hover:bg-white/40 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        animate={audioFinished ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 1, repeat: audioFinished ? Infinity : 0 }}
                      >
                        <Heart className="w-6 h-6 text-pink-500 group-hover:text-pink-600" />
                      </motion.div>
                      <span className="text-gray-700 font-medium">
                        {audioFinished ? 'Tap to Pray for Them' : 'Pray While Listening'}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Video Prayer */}
          {prayer.content_type === 'video' && prayer.content_url && (
            <div className="rounded-xl overflow-hidden aspect-video bg-gray-100">
              <video
                src={prayer.content_url}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Video placeholder if no URL */}
          {prayer.content_type === 'video' && !prayer.content_url && (
            <div className="glass rounded-xl p-4 text-center aspect-video flex items-center justify-center bg-gray-100">
              <div>
                <div className="text-4xl mb-2">🎥</div>
                <p className="text-sm text-gray-600">Video Prayer</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Section */}
        {!isPraying ? (
          <>
            {/* For non-audio prayers, show the full reply interface */}
            {!isAudioPrayer && (
              <>
                {/* Reply Type Selector */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handleReplyTypeClick('text')}
                    className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
                      replyType === 'text'
                        ? 'bg-gradient-to-r from-yellow-300 to-purple-300'
                        : 'glass hover:glass-strong'
                    }`}
                  >
                    {replyType === 'text' && (
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
                    <Type className="w-5 h-5 text-gray-700" />
                    <span className="text-sm text-gray-700">Text</span>
                  </button>

                  <button
                    onClick={() => handleReplyTypeClick('audio')}
                    className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
                      replyType === 'audio'
                        ? 'bg-gradient-to-r from-yellow-300 to-purple-300'
                        : 'glass hover:glass-strong'
                    }`}
                  >
                    {replyType === 'audio' && (
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
                    <Mic className="w-5 h-5 text-gray-700" />
                    <span className="text-sm text-gray-700">Voice</span>
                  </button>

                  <button
                    onClick={() => handleReplyTypeClick('video')}
                    className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
                      replyType === 'video'
                        ? 'bg-gradient-to-r from-yellow-300 to-purple-300'
                        : 'glass hover:glass-strong'
                    }`}
                  >
                    {replyType === 'video' && (
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
                    <Video className="w-5 h-5 text-gray-700" />
                    <span className="text-sm text-gray-700">Video</span>
                  </button>
                </div>

                {/* Reply Form - Expands when type is selected */}
                <AnimatePresence>
                  {showReplyForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="space-y-4 pt-2">
                        {/* Text Reply */}
                        {replyType === 'text' && (
                          <div>
                            <label className="text-sm text-gray-600 mb-2 block">
                              Your Prayer
                            </label>
                            <Textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Type your prayer here..."
                              rows={4}
                              className="glass border-0 focus:ring-2 focus:ring-purple-300 resize-none"
                            />
                          </div>
                        )}

                        {/* Audio Reply */}
                        {replyType === 'audio' && (
                          <AudioRecorder
                            onRecordingComplete={handleReplyAudioComplete}
                            maxDuration={120}
                          />
                        )}

                        {/* Video Reply (placeholder) */}
                        {replyType === 'video' && (
                          <div className="glass rounded-xl p-6 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-purple-300 flex items-center justify-center">
                                <Video className="w-8 h-8 text-white" />
                              </div>
                              <p className="text-gray-700">Tap to record video prayer</p>
                              <p className="text-xs text-gray-500">Max 1 minute</p>
                            </div>
                          </div>
                        )}

                        {/* Anonymous Toggle */}
                        <div className="glass rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-800">Send Anonymously</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Your identity will be hidden
                              </p>
                            </div>
                            <Switch
                              checked={isAnonymous}
                              onCheckedChange={setIsAnonymous}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handlePray}
                  className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-6 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Send className="w-5 h-5" />
                  <span>Send Prayer</span>
                </Button>
              </>
            )}

            {/* For audio prayers, show expanded response options */}
            {isAudioPrayer && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">Or send a personal response:</p>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setReplyType('text');
                      setShowReplyForm(true);
                    }}
                    variant="outline"
                    className="flex-1 glass hover:bg-white/30"
                  >
                    <Type className="w-4 h-4 mr-2" />
                    Text
                  </Button>
                  <Button
                    onClick={() => {
                      setReplyType('audio');
                      setShowReplyForm(true);
                    }}
                    variant="outline"
                    className="flex-1 glass hover:bg-white/30"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Voice
                  </Button>
                </div>

                {/* Expanded reply form for audio prayers */}
                <AnimatePresence>
                  {showReplyForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-2">
                        {replyType === 'text' && (
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Type your prayer response..."
                            rows={3}
                            className="glass border-0 focus:ring-2 focus:ring-purple-300 resize-none"
                          />
                        )}
                        {replyType === 'audio' && (
                          <AudioRecorder
                            onRecordingComplete={handleReplyAudioComplete}
                            maxDuration={120}
                          />
                        )}

                        <Button
                          onClick={handlePray}
                          className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full"
                          disabled={replyType === 'text' && !replyContent.trim() && !replyAudioBlob}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Response
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-6"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-6xl mb-3"
            >
              ✨
            </motion.div>
            <p className="text-gray-700">Prayer sent...</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
