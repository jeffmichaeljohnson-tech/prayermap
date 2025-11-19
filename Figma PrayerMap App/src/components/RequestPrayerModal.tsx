import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Type, Mic, Video } from 'lucide-react';
import { Prayer } from '../types/prayer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';

interface RequestPrayerModalProps {
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  onSubmit: (prayer: Omit<Prayer, 'id' | 'createdAt' | 'prayedBy'>) => void;
}

export function RequestPrayerModal({ userLocation, onClose, onSubmit }: RequestPrayerModalProps) {
  const [contentType, setContentType] = useState<'text' | 'audio' | 'video'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userName, setUserName] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;

    onSubmit({
      title: title.trim() || undefined,
      content: content.trim(),
      contentType,
      location: userLocation,
      userName: isAnonymous ? undefined : userName.trim() || undefined,
      isAnonymous
    });
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
        className="glass-strong rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
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
            onClick={() => setContentType('text')}
            className={`relative flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
              contentType === 'text' 
                ? 'glass-strong shadow-lg' 
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
            <Type className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700">Text</span>
          </button>
          
          <button
            onClick={() => setContentType('audio')}
            className={`flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
              contentType === 'audio' 
                ? 'glass-strong shadow-lg' 
                : 'glass hover:glass-strong'
            }`}
          >
            <Mic className="w-5 h-5 text-gray-700" />
            <span className="text-sm text-gray-700">Audio</span>
          </button>
          
          <button
            onClick={() => setContentType('video')}
            className={`flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
              contentType === 'video' 
                ? 'glass-strong shadow-lg' 
                : 'glass hover:glass-strong'
            }`}
          >
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
            <div className="glass rounded-xl p-6 text-center">
              <Mic className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-600 mb-3">Record your prayer request</p>
              <Button className="glass-strong text-[rgb(62,62,62)]">Start Recording</Button>
              <input 
                type="hidden" 
                value={content || 'Audio prayer request recorded'}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}

          {contentType === 'video' && (
            <div className="glass rounded-xl p-6 text-center">
              <Video className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-600 mb-3">Record a video message</p>
              <Button className="glass-strong">Start Recording</Button>
              <input 
                type="hidden" 
                value={content || 'Video prayer request recorded'}
                onChange={(e) => setContent(e.target.value)}
              />
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

          {!isAnonymous && (
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Your Name (optional)
              </label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g., John"
                className="glass border-white/30 text-gray-800 placeholder:text-gray-500"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() && contentType === 'text'}
          className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-6"
        >
          Send Prayer Request
        </Button>
      </motion.div>
    </motion.div>
  );
}