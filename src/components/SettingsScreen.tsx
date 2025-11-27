import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, MessageSquare, Mail, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { changePassword, submitSuggestion } from '../services/userService';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) return;

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);

    const result = await changePassword(newPassword);

    setIsChangingPassword(false);

    if (result.success) {
      setPasswordChanged(true);
      setTimeout(() => {
        setPasswordChanged(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } else {
      setPasswordError(result.error || 'Failed to change password');
    }
  };

  const handleSendSuggestion = async () => {
    if (!suggestion.trim() || !user) return;

    setIsSendingSuggestion(true);
    setSuggestionError(null);

    const result = await submitSuggestion(user.id, suggestion, user.email);

    setIsSendingSuggestion(false);

    if (result.success) {
      setSuggestionSent(true);
      setTimeout(() => {
        setSuggestionSent(false);
        setSuggestion('');
      }, 2000);
    } else {
      setSuggestionError(result.error || 'Failed to send suggestion');
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
        {/* Suggestion Box Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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

            {suggestionError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-600 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {suggestionError}
              </motion.div>
            )}

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
                disabled={!suggestion.trim() || isSendingSuggestion}
                className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-3"
              >
                {isSendingSuggestion ? 'Sending...' : 'Send Suggestion'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Change Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
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

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-500"
              >
                Passwords do not match
              </motion.p>
            )}

            {passwordError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-600 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {passwordError}
              </motion.div>
            )}

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
                disabled={!newPassword || newPassword !== confirmPassword || isChangingPassword}
                className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-3"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* User Info */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-4"
          >
            <p className="text-sm text-gray-600">Signed in as</p>
            <p className="text-gray-800 font-medium">{user.email}</p>
          </motion.div>
        )}

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-600 text-sm"
        >
          <p>PrayerMap v1.0</p>
          <p className="italic mt-1">Pray long. Pray hard.</p>
        </motion.div>
      </div>
    </div>
  );
}