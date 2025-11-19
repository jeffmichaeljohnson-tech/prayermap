import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, MessageSquare, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);

  const handleChangePassword = () => {
    if (newPassword && newPassword === confirmPassword) {
      setPasswordChanged(true);
      setTimeout(() => {
        setPasswordChanged(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    }
  };

  const handleSendSuggestion = () => {
    if (suggestion.trim()) {
      setSuggestionSent(true);
      setTimeout(() => {
        setSuggestionSent(false);
        setSuggestion('');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))] p-4">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-4 mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h2 className="text-gray-800">Settings</h2>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Change Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 glass rounded-xl">
              <Lock className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h3 className="text-gray-800">Change Password</h3>
              <p className="text-sm text-gray-600">Update your account password</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Current Password
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="glass border-white/30 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="glass border-white/30 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="glass border-white/30 text-gray-800"
              />
            </div>

            {passwordChanged ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4"
              >
                <div className="text-4xl mb-2">✓</div>
                <p className="text-gray-700">Password updated successfully!</p>
              </motion.div>
            ) : (
              <Button
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-3"
              >
                Update Password
              </Button>
            )}
          </div>
        </motion.div>

        {/* Suggestion Box Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 glass rounded-xl">
              <MessageSquare className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h3 className="text-gray-800">Suggestion Box</h3>
              <p className="text-sm text-gray-600">Share your feedback with us</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Your Suggestion
              </label>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Tell us how we can improve PrayerMap..."
                rows={5}
                className="glass border-white/30 text-gray-800 placeholder:text-gray-500 resize-none"
              />
            </div>

            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-700">Contact us directly</p>
                <a 
                  href="mailto:contact@prayermap.net" 
                  className="text-sm text-blue-600 hover:underline"
                >
                  contact@prayermap.net
                </a>
              </div>
            </div>

            {suggestionSent ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4"
              >
                <div className="text-4xl mb-2">✓</div>
                <p className="text-gray-700">Thank you for your feedback!</p>
              </motion.div>
            ) : (
              <Button
                onClick={handleSendSuggestion}
                disabled={!suggestion.trim()}
                className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-3"
              >
                Send Suggestion
              </Button>
            )}
          </div>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-600 text-sm"
        >
          <p>PrayerMap v1.0</p>
          <p className="italic mt-1">See where prayer is needed. Send prayer where you are.</p>
        </motion.div>
      </div>
    </div>
  );
}
