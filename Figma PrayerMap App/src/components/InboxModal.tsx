import { motion } from 'motion/react';
import { X, Heart } from 'lucide-react';

interface InboxModalProps {
  onClose: () => void;
}

interface ReceivedPrayer {
  id: string;
  senderName: string;
  message: string;
  date: Date;
  prayerTitle: string;
}

export function InboxModal({ onClose }: InboxModalProps) {
  // Mock received prayers
  const receivedPrayers: ReceivedPrayer[] = [
    {
      id: '1',
      senderName: 'Sarah',
      message: 'Praying for your strength and healing. God is with you! 🙏',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      prayerTitle: 'Your prayer request'
    },
    {
      id: '2',
      senderName: 'Michael',
      message: 'Sending prayers and love your way. You are not alone.',
      date: new Date(Date.now() - 5 * 60 * 60 * 1000),
      prayerTitle: 'Your prayer request'
    },
    {
      id: '3',
      senderName: 'Anonymous',
      message: 'Prayed for you today. May you find peace and comfort.',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      prayerTitle: 'Your prayer request'
    }
  ];

  const getTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
        className="glass-strong rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 glass rounded-xl">
              <Heart className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <h3 className="text-gray-800">Prayer Inbox</h3>
              <p className="text-sm text-gray-600">{receivedPrayers.length} prayers received</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Prayers List */}
        <div className="flex-1 overflow-y-auto space-y-3 -mx-2 px-2">
          {receivedPrayers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-3">📬</div>
              <p className="text-gray-600">No prayers received yet</p>
              <p className="text-sm text-gray-500 mt-2">
                When someone prays for you, you'll see it here
              </p>
            </div>
          ) : (
            receivedPrayers.map((prayer) => (
              <motion.div
                key={prayer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 hover:glass-strong transition-all"
              >
                <div className="flex items-start justify-between mb-[8px] mt-[0px] mr-[50px] ml-[0px]">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🙏</span>
                    <div>
                      <p className="text-gray-800">{prayer.senderName}</p>
                      <p className="text-xs text-gray-500">{getTimeAgo(prayer.date)}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {prayer.message}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
