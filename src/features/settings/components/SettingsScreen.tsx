import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, MessageSquare, Mail, AlertCircle, LogOut, User, Bell, BarChart3, Flame, Heart, Send, Loader2, RefreshCw, Moon, Sun, Monitor, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { useAuth } from '../../authentication/contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { changePassword, submitSuggestion, updateDisplayName, fetchUserStats, type UserPrayerStats } from '../../../services/userService';
import { pushNotificationService } from '../../../services/pushNotificationService';
import { getReminderSettings, setReminderSettings, isReminderSupported } from '../../../services/reminderService';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Display name state
  const [displayName, setDisplayName] = useState(user?.user_metadata?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameUpdated, setNameUpdated] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Suggestion state
  const [suggestion, setSuggestion] = useState('');
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);

  // Prayer stats state
  const [stats, setStats] = useState<UserPrayerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isLoadingReminder, setIsLoadingReminder] = useState(true);

  // Check if push notifications are supported on this platform
  const pushSupported = pushNotificationService.isSupported();
  
  // Check if reminders are supported on this platform
  const reminderSupported = isReminderSupported();

  // Check initial notification state
  useEffect(() => {
    setNotificationsEnabled(pushNotificationService.isInitialized());
  }, []);

  // Fetch prayer stats on mount
  useEffect(() => {
    if (user?.id) {
      fetchUserStats(user.id).then(data => {
        setStats(data);
        setLoadingStats(false);
      });
    }
  }, [user?.id]);

  // Load reminder settings on mount
  useEffect(() => {
    getReminderSettings().then(settings => {
      setReminderEnabled(settings.enabled);
      setReminderTime(settings.time);
      setIsLoadingReminder(false);
    });
  }, []);

  const handleReminderToggle = async () => {
    const newEnabled = !reminderEnabled;
    setReminderEnabled(newEnabled);

    const success = await setReminderSettings({
      enabled: newEnabled,
      time: reminderTime,
    });

    if (!success) {
      setReminderEnabled(!newEnabled); // Revert on failure
    }
  };

  const handleReminderTimeChange = async (newTime: string) => {
    setReminderTime(newTime);

    if (reminderEnabled) {
      await setReminderSettings({
        enabled: true,
        time: newTime,
      });
    }
  };

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;

    setIsUpdatingName(true);
    setNameError(null);

    const result = await updateDisplayName(displayName.trim());

    setIsUpdatingName(false);

    if (result.success) {
      setNameUpdated(true);
      setTimeout(() => setNameUpdated(false), 2000);
    } else {
      setNameError(result.error || 'Failed to update name');
    }
  };

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);

    const { error } = await signOut();

    setIsLoggingOut(false);

    if (error) {
      setLogoutError(error.message || 'Failed to sign out');
    }
    // If successful, AuthProvider will update state and App.tsx will show AuthModal
  };

  const handleToggleNotifications = async () => {
    if (!user) return;

    setIsTogglingNotifications(true);

    if (!notificationsEnabled) {
      const success = await pushNotificationService.initialize(user.id);
      setNotificationsEnabled(success);
    } else {
      await pushNotificationService.removeToken(user.id);
      setNotificationsEnabled(false);
    }

    setIsTogglingNotifications(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))] p-4">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-4 mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <h2 className="text-gray-800 dark:text-gray-100">Settings</h2>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Prayer Journey Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 glass rounded-xl">
              <BarChart3 className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-gray-800 dark:text-gray-100">Your Prayer Journey</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your impact in the community</p>
            </div>
          </div>

          {loadingStats ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Prayers Sent */}
              <div className="glass rounded-2xl p-4 text-center">
                <Send className="w-6 h-6 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.prayersSent}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Prayers Sent</p>
              </div>

              {/* Prayers Received */}
              <div className="glass rounded-2xl p-4 text-center">
                <Heart className="w-6 h-6 mx-auto mb-2 text-pink-500 dark:text-pink-400" />
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.prayersReceived}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Prayers Received</p>
              </div>

              {/* Current Streak */}
              <div className="glass rounded-2xl p-4 text-center">
                <Flame className="w-6 h-6 mx-auto mb-2 text-orange-500 dark:text-orange-400" />
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.currentStreak}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Day Streak</p>
              </div>

              {/* Requests Created */}
              <div className="glass rounded-2xl p-4 text-center">
                <span className="text-2xl block mb-2">🙏</span>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.prayersCreated}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Requests Made</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">Unable to load stats</p>
          )}
        </motion.div>

        {/* Display Name Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 glass rounded-xl">
              <User className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-gray-800 dark:text-gray-100">Display Name</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">How others see you in PrayerMap</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="glass border-white/30 text-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                This name appears when you pray for others
              </p>
            </div>

            {nameError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-600 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {nameError}
              </motion.div>
            )}

            {nameUpdated ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4"
              >
                <div className="text-4xl mb-2">✓</div>
                <p className="text-gray-700 dark:text-gray-300">Name updated!</p>
              </motion.div>
            ) : (
              <Button
                onClick={handleUpdateName}
                disabled={!displayName.trim() || displayName === user?.user_metadata?.name || isUpdatingName}
                className="w-full bg-gradient-to-r from-yellow-300 to-purple-300 hover:from-yellow-400 hover:to-purple-400 text-gray-800 rounded-full py-3"
              >
                {isUpdatingName ? 'Updating...' : 'Update Name'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Suggestion Box Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 glass rounded-xl">
              <MessageSquare className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-gray-800 dark:text-gray-100">Suggestion Box</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Share your feedback with us</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Your Suggestion
              </label>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Tell us how we can improve PrayerMap..."
                rows={5}
                className="glass border-white/30 text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-500 resize-none"
              />
            </div>

            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">Contact us directly</p>
                <a
                  href="mailto:contact@prayermap.net"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
                <p className="text-gray-700 dark:text-gray-300">Thank you for your feedback!</p>
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
          transition={{ delay: 0.25 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 glass rounded-xl">
              <Lock className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-gray-800 dark:text-gray-100">Change Password</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="glass border-white/30 text-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="glass border-white/30 text-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
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
                <p className="text-gray-700 dark:text-gray-300">Password updated successfully!</p>
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
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-4"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">Signed in as</p>
            <p className="text-gray-800 dark:text-gray-100 font-medium">{user.email}</p>
          </motion.div>
        )}

        {/* Push Notifications Section - Only shown on native platforms */}
        {pushSupported && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="glass-strong rounded-3xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 glass rounded-xl">
                  <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="text-gray-800 dark:text-gray-100">Push Notifications</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when someone prays for you</p>
                </div>
              </div>
              <button
                onClick={handleToggleNotifications}
                disabled={isTogglingNotifications}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  notificationsEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                } ${isTogglingNotifications ? 'opacity-50' : ''}`}
              >
                <motion.div
                  animate={{ x: notificationsEnabled ? 24 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full shadow absolute top-1"
                />
              </button>
            </div>
          </motion.div>
        )}

        {/* Daily Prayer Reminder Section - Only shown on native platforms */}
        {reminderSupported && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.43 }}
            className="glass-strong rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 glass rounded-xl">
                <Clock className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-800 dark:text-gray-100">Daily Prayer Reminder</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get reminded to pray each day
                </p>
              </div>
              <button
                onClick={handleReminderToggle}
                disabled={isLoadingReminder}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  reminderEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                } ${isLoadingReminder ? 'opacity-50' : ''}`}
              >
                <motion.div
                  animate={{ x: reminderEnabled ? 24 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full shadow absolute top-1"
                />
              </button>
            </div>

            {reminderEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-white/20"
              >
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Reminder Time
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  className="w-full px-4 py-3 glass rounded-xl text-gray-800 dark:text-white bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Replay Tutorial Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.43 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 glass rounded-xl">
                <RefreshCw className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="text-gray-800 dark:text-gray-100">Tutorial</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Watch the introduction again</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('prayermap-onboarding-complete');
                window.location.reload();
              }}
              className="px-4 py-2 glass rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
            >
              Replay
            </button>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 glass rounded-xl">
              <Moon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-gray-800 dark:text-gray-100">Appearance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Choose your theme</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-yellow-300 to-purple-300 dark:from-yellow-500 dark:to-purple-500 text-gray-800'
                  : 'glass hover:bg-white/30 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs font-medium">Light</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-yellow-300 to-purple-300 dark:from-yellow-500 dark:to-purple-500 text-gray-800'
                  : 'glass hover:bg-white/30 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs font-medium">Dark</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'bg-gradient-to-r from-yellow-300 to-purple-300 dark:from-yellow-500 dark:to-purple-500 text-gray-800'
                  : 'glass hover:bg-white/30 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-xs font-medium">System</span>
            </button>
          </div>
        </motion.div>

        {/* Sign Out Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 glass rounded-xl">
              <LogOut className="w-6 h-6 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-gray-800 dark:text-gray-100">Sign Out</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sign out of your account</p>
            </div>
          </div>

          {logoutError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-600 text-sm mb-4"
            >
              <AlertCircle className="w-4 h-4" />
              {logoutError}
            </motion.div>
          )}

          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full bg-gradient-to-r from-red-300 to-pink-300 hover:from-red-400 hover:to-pink-400 text-gray-800 rounded-full py-3"
          >
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-600 dark:text-gray-400 text-sm"
        >
          <p>PrayerMap v1.0</p>
          <p className="italic mt-1">Pray long. Pray hard.</p>
        </motion.div>
      </div>
    </div>
  );
}