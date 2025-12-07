import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Type, Mic, Video, Heart, Trash2, MoreVertical, Flag, Ban, Share2, Bookmark } from 'lucide-react';
import type { Prayer } from '../types/prayer';
import { PRAYER_CATEGORIES } from '../types/prayer';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { AudioMessagePlayer } from '../../media/components/AudioMessagePlayer';
import { VideoMessagePlayer } from '../../media/components/VideoMessagePlayer';
import { AudioRecorder } from '../../media/components/AudioRecorder';
import { useAuth } from '../../authentication/contexts/AuthContext';
import {
  submitReport,
  blockUser,
  REPORT_REASONS,
  type ReportReason,
} from '../../../services/moderationService';
import { sharePrayer, canShare } from '../../../services/shareService';
import { useSavedPrayers } from '../hooks/useSavedPrayers';

// Response data passed when user prays
export interface PrayerResponseData {
  message: string;
  contentType: 'text' | 'audio' | 'video';
  isAnonymous: boolean;
  audioBlob?: Blob;
}

interface PrayerDetailModalProps {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  onPray: (prayer: Prayer, responseData: PrayerResponseData) => void;
  onDelete?: (prayerId: string, userId: string) => Promise<boolean>;
  onBlockUser?: (blockedUserId: string) => void;
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

export function PrayerDetailModal({ prayer, userLocation, onClose, onPray, onDelete, onBlockUser }: PrayerDetailModalProps) {
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Report/Block state
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('inappropriate');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  // Share state
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<'copied' | null>(null);

  // Save/bookmark state
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuth();
  const isOwner = user?.id === prayer.user_id;

  // Saved prayers hook
  const { isSaved, savePrayer, unsavePrayer } = useSavedPrayers(user?.id);
  const prayerIsSaved = isSaved(prayer.id);

  // Handle toggling save state
  const handleToggleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    if (prayerIsSaved) {
      await unsavePrayer(prayer.id);
    } else {
      await savePrayer(prayer.id);
    }
    setIsSaving(false);
  };

  const isAudioPrayer = prayer.content_type === 'audio' && prayer.content_url;

  const handleReplyTypeClick = (type: 'text' | 'audio' | 'video') => {
    setReplyType(type);
    setShowReplyForm(true);
  };

  const handlePray = () => {
    setIsPraying(true);
    setShowSpotlight(true);

    // Build response data from user input
    const responseData: PrayerResponseData = {
      message: replyContent.trim() || 'Praying for you!',
      contentType: replyType,
      isAnonymous: isAnonymous,
      audioBlob: replyAudioBlob || undefined,
    };

    setTimeout(() => {
      onPray(prayer, responseData);
    }, 2500);
  };

  const handleQuickPray = useCallback(() => {
    // Quick one-touch prayer response (default message, not anonymous)
    setIsPraying(true);
    setShowSpotlight(true);

    const responseData: PrayerResponseData = {
      message: 'Praying for you!',
      contentType: 'text',
      isAnonymous: false,
    };

    setTimeout(() => {
      onPray(prayer, responseData);
    }, 2500);
  }, [prayer, onPray]);

  const handleAudioEnded = useCallback(() => {
    setAudioFinished(true);
  }, []);

  const handleReplyAudioComplete = useCallback((blob: Blob, _duration: number) => {
    setReplyAudioBlob(blob);
    setReplyContent('Audio response recorded');
  }, []);

  const handleDelete = async () => {
    if (!onDelete || !user) return;

    setIsDeleting(true);
    const success = await onDelete(prayer.id, user.id);
    setIsDeleting(false);

    if (success) {
      onClose();
    }
  };

  // Handle report submission
  const handleReport = async () => {
    if (!user) return;

    setIsSubmittingReport(true);

    const success = await submitReport({
      reporterId: user.id,
      targetType: 'prayer',
      targetId: prayer.id,
      reason: reportReason,
      details: reportDetails || undefined,
    });

    setIsSubmittingReport(false);

    if (success) {
      setReportSubmitted(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSubmitted(false);
        setReportReason('inappropriate');
        setReportDetails('');
      }, 2000);
    }
  };

  // Handle blocking a user
  const handleBlockUser = async () => {
    if (!user || !prayer.user_id) return;

    setIsBlocking(true);
    const success = await blockUser(user.id, prayer.user_id);
    setIsBlocking(false);

    if (success) {
      // Notify parent to update blocked users list
      onBlockUser?.(prayer.user_id);
      onClose();
    }
  };

  // Handle sharing prayer
  const handleShare = async () => {
    setIsSharing(true);
    setShareResult(null);

    const result = await sharePrayer({
      title: prayer.title || '',
      content: prayer.content,
      prayerId: prayer.id,
      isAnonymous: prayer.is_anonymous,
      userName: prayer.user_name,
    });

    setIsSharing(false);

    // Show "Copied" feedback for clipboard fallback
    if (result === 'copied') {
      setShareResult('copied');
      setTimeout(() => setShareResult(null), 2000);
    }
  };

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

        {/* Header Actions - Share, More Menu, Close */}
        <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
          {/* Save/Bookmark Button */}
          {user && !isOwner && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleSave}
              disabled={isSaving}
              className={`p-2 rounded-full transition-colors ${
                prayerIsSaved 
                  ? 'bg-yellow-100 hover:bg-yellow-200' 
                  : 'hover:bg-white/20'
              }`}
              aria-label={prayerIsSaved ? 'Remove from saved' : 'Save prayer'}
            >
              <Bookmark 
                className={`w-5 h-5 transition-colors ${
                  isSaving ? 'animate-pulse' : ''
                } ${
                  prayerIsSaved 
                    ? 'fill-yellow-500 text-yellow-500' 
                    : 'text-gray-600'
                }`} 
              />
            </motion.button>
          )}

          {/* Share Button in Header */}
          {canShare() && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              disabled={isSharing}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Share prayer"
            >
              {shareResult === 'copied' ? (
                <span className="text-green-600 text-xs font-medium">✓</span>
              ) : (
                <Share2 className={`w-5 h-5 text-gray-600 ${isSharing ? 'animate-pulse' : ''}`} />
              )}
            </motion.button>
          )}

          {/* Report/Block Menu - only for other users' prayers */}
          {!isOwner && user && prayer.user_id && (
            <div className="relative">
              <button
                onClick={() => setShowReportMenu(!showReportMenu)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showReportMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowReportMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg py-1 min-w-[160px] z-50"
                    >
                      <button
                        onClick={() => {
                          setShowReportMenu(false);
                          setShowReportModal(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Flag className="w-4 h-4" />
                        Report Prayer
                      </button>
                      <button
                        onClick={() => {
                          setShowReportMenu(false);
                          handleBlockUser();
                        }}
                        disabled={isBlocking}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Ban className="w-4 h-4" />
                        {isBlocking ? 'Blocking...' : 'Block User'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🙏</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {prayer.content_type === 'audio' && (
                  <div className="p-1.5 bg-pink-100 rounded-lg">
                    <Mic className="w-4 h-4 text-pink-500" />
                  </div>
                )}
                {prayer.content_type === 'video' && (
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Video className="w-4 h-4 text-purple-500" />
                  </div>
                )}
                <h3 className="text-gray-800">
                  {prayer.is_anonymous ? 'Anonymous' : prayer.user_name || 'Anonymous'}
                </h3>
              </div>
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
          {/* Category Badge and Title */}
          <div className="flex items-start gap-2 flex-wrap mb-3">
            {(() => {
              const categoryInfo = PRAYER_CATEGORIES.find(c => c.id === prayer.category);
              if (!categoryInfo) return null;
              
              // Map category colors to Tailwind classes
              const colorClasses: Record<string, string> = {
                red: 'bg-red-100 text-red-700',
                blue: 'bg-blue-100 text-blue-700',
                amber: 'bg-amber-100 text-amber-700',
                pink: 'bg-pink-100 text-pink-700',
                purple: 'bg-purple-100 text-purple-700',
                green: 'bg-green-100 text-green-700',
                indigo: 'bg-indigo-100 text-indigo-700',
                yellow: 'bg-yellow-100 text-yellow-700',
                gray: 'bg-gray-100 text-gray-700',
              };
              
              return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[categoryInfo.color] || 'bg-gray-100 text-gray-700'}`}>
                  <span>{categoryInfo.emoji}</span>
                  <span>{categoryInfo.label}</span>
                </span>
              );
            })()}
            {prayer.title && (
              <h4 className="text-gray-800 text-lg flex-1">{prayer.title}</h4>
            )}
          </div>

          {/* Text Prayer */}
          {prayer.content_type === 'text' && (
            <p className="text-gray-700 leading-relaxed font-[Inter]">{prayer.content}</p>
          )}

          {/* Audio Prayer - with beautiful player */}
          {prayer.content_type === 'audio' && prayer.content_url && (
            <div className="space-y-4">
              <AudioMessagePlayer
                src={prayer.content_url}
                className="my-4"
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

          {/* Audio placeholder if no URL */}
          {prayer.content_type === 'audio' && !prayer.content_url && (
            <div className="my-4 p-4 glass rounded-xl text-center">
              <p className="text-gray-500 text-sm">🎤 Audio unavailable</p>
            </div>
          )}

          {/* Video Prayer */}
          {prayer.content_type === 'video' && prayer.content_url && (
            <div className="my-4 rounded-2xl overflow-hidden">
              <VideoMessagePlayer
                src={prayer.content_url}
              />
            </div>
          )}

          {/* Video placeholder if no URL */}
          {prayer.content_type === 'video' && !prayer.content_url && (
            <div className="my-4 p-4 glass rounded-xl text-center">
              <p className="text-gray-500 text-sm">🎥 Video unavailable</p>
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
                        ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-on-gradient'
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
                    <Type className={`w-5 h-5 ${replyType === 'text' ? 'text-on-gradient' : 'text-gray-700'}`} />
                    <span className={`text-sm ${replyType === 'text' ? 'text-on-gradient' : 'text-gray-700'}`}>Text</span>
                  </button>

                  <button
                    onClick={() => handleReplyTypeClick('audio')}
                    className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
                      replyType === 'audio'
                        ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-on-gradient'
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
                    <Mic className={`w-5 h-5 ${replyType === 'audio' ? 'text-on-gradient' : 'text-gray-700'}`} />
                    <span className={`text-sm ${replyType === 'audio' ? 'text-on-gradient' : 'text-gray-700'}`}>Voice</span>
                  </button>

                  <button
                    onClick={() => handleReplyTypeClick('video')}
                    className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
                      replyType === 'video'
                        ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-on-gradient'
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
                    <Video className={`w-5 h-5 ${replyType === 'video' ? 'text-on-gradient' : 'text-gray-700'}`} />
                    <span className={`text-sm ${replyType === 'video' ? 'text-on-gradient' : 'text-gray-700'}`}>Video</span>
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

                <div className="flex gap-3">
                  {/* Share Button */}
                  {canShare() && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleShare}
                      disabled={isSharing}
                      className="p-4 glass rounded-2xl hover:glass-strong transition-all flex items-center justify-center"
                      aria-label="Share prayer"
                    >
                      {shareResult === 'copied' ? (
                        <span className="text-green-600 text-sm font-medium px-1">Copied!</span>
                      ) : (
                        <Share2 className={`w-5 h-5 text-gray-700 ${isSharing ? 'animate-pulse' : ''}`} />
                      )}
                    </motion.button>
                  )}

                  {/* Pray Button */}
                  <Button
                    onClick={handlePray}
                    className="flex-1 bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-on-gradient rounded-full py-6 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Send className="w-5 h-5" />
                    <span>Send Prayer</span>
                  </Button>
                </div>
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

                        <div className="flex gap-3">
                          {/* Share Button */}
                          {canShare() && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleShare}
                              disabled={isSharing}
                              className="p-3 glass rounded-xl hover:glass-strong transition-all flex items-center justify-center"
                              aria-label="Share prayer"
                            >
                              {shareResult === 'copied' ? (
                                <span className="text-green-600 text-xs font-medium">Copied!</span>
                              ) : (
                                <Share2 className={`w-4 h-4 text-gray-700 ${isSharing ? 'animate-pulse' : ''}`} />
                              )}
                            </motion.button>
                          )}

                          <Button
                            onClick={handlePray}
                            className="flex-1 bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-on-gradient rounded-full"
                            disabled={replyType === 'text' && !replyContent.trim() && !replyAudioBlob}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Response
                          </Button>
                        </div>
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

        {/* Delete Prayer Section - only visible to owner */}
        {isOwner && onDelete && !isPraying && (
          <div className="mt-4 pt-4 border-t border-white/20">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50/50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Prayer</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 glass rounded-xl text-gray-700"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              {reportSubmitted ? (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center"
                  >
                    <span className="text-2xl">✓</span>
                  </motion.div>
                  <p className="text-gray-800 font-medium">Report submitted</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Thank you for helping keep our community safe
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-full">
                      <Flag className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Report Prayer</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Why are you reporting this prayer?
                  </p>

                  <div className="space-y-2 mb-4">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => setReportReason(reason.id)}
                        className={`w-full p-3 rounded-xl text-left text-sm transition-all ${
                          reportReason === reason.id
                            ? 'bg-red-50 border-2 border-red-300 text-red-700'
                            : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Additional details (optional)"
                    rows={3}
                    className="w-full p-3 rounded-xl bg-gray-50 text-sm resize-none mb-4 border-2 border-transparent focus:border-gray-200 focus:outline-none"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowReportModal(false);
                        setReportReason('inappropriate');
                        setReportDetails('');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReport}
                      disabled={isSubmittingReport}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
