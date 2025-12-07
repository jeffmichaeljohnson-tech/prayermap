/**
 * Settings Page
 * Admin settings including password change and app configuration
 */

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { toast } from 'sonner'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { 
  usePrayerExpirationSetting, 
  useMemorialLineDurationSetting 
} from '../hooks/useAppSettings'
import { 
  useExpiredPrayersCount, 
  useTriggerArchive 
} from '../hooks/useArchivedPrayers'

export function SettingsPage() {
  const { user } = useAdminAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your admin account and app settings</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Role</label>
            <p className="text-gray-900 capitalize">{user?.role}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">User ID</label>
            <p className="text-gray-900 font-mono text-sm">{user?.id}</p>
          </div>
        </div>
      </div>

      {/* Prayer Expiration Settings */}
      <PrayerExpirationSection />

      {/* Memorial Line Duration Settings */}
      <MemorialLineDurationSection />

      {/* Password Change */}
      <PasswordChangeSection />

      {/* Password Reset via Email */}
      <PasswordResetSection email={user?.email} />
    </div>
  )
}

function PrayerExpirationSection() {
  const { expirationDays, isLoading, updateExpirationDays, isUpdating } = usePrayerExpirationSetting()
  const { data: expiredCount } = useExpiredPrayersCount()
  const triggerArchive = useTriggerArchive()
  const [localDays, setLocalDays] = useState<number | null>(null)

  // Use local state if set, otherwise use fetched value
  const displayDays = localDays ?? expirationDays

  const handleSave = () => {
    if (localDays !== null && localDays >= 1 && localDays <= 365) {
      updateExpirationDays(localDays)
      setLocalDays(null)
    }
  }

  const hasChanges = localDays !== null && localDays !== expirationDays

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Prayer Expiration</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm text-gray-600">Prayers expire after</label>
          <Input
            type="number"
            value={displayDays}
            onChange={(e) => setLocalDays(Number(e.target.value))}
            min={1}
            max={365}
            className="w-24"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-600">days</span>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            isLoading={isUpdating}
            size="sm"
          >
            Save
          </Button>
        </div>
        
        <p className="text-xs text-gray-500">
          Expired prayers are archived, not deleted. They can be restored from the Archived Prayers page.
        </p>

        {/* Expired Prayers Alert */}
        {expiredCount !== undefined && expiredCount > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-800 font-medium">
                  {expiredCount} prayer{expiredCount !== 1 ? 's' : ''} pending archive
                </p>
                <p className="text-amber-600 text-sm">
                  These prayers have passed their expiration date.
                </p>
              </div>
              <Button
                onClick={() => triggerArchive.mutate({})}
                disabled={triggerArchive.isPending}
                isLoading={triggerArchive.isPending}
                variant="outline"
                size="sm"
              >
                Archive Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MemorialLineDurationSection() {
  const { durationDays, isLoading, updateDurationDays, isUpdating } = useMemorialLineDurationSetting()
  const [localDays, setLocalDays] = useState<number | null>(null)

  // Use local state if set, otherwise use fetched value
  const displayDays = localDays ?? durationDays

  const handleSave = () => {
    if (localDays !== null && localDays >= 1 && localDays <= 730) {
      updateDurationDays(localDays)
      setLocalDays(null)
    }
  }

  const hasChanges = localDays !== null && localDays !== durationDays

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Memorial Lines</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm text-gray-600">Memorial lines persist for</label>
          <Input
            type="number"
            value={displayDays}
            onChange={(e) => setLocalDays(Number(e.target.value))}
            min={1}
            max={730}
            className="w-24"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-600">days</span>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            isLoading={isUpdating}
            size="sm"
          >
            Save
          </Button>
        </div>
        
        <p className="text-xs text-gray-500">
          Memorial lines connect prayer locations with response locations on the Living Map. 
          Default is 365 days (1 year).
        </p>
      </div>
    </div>
  )
}

function PasswordChangeSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    if (newPassword.length > 256) {
      toast.error('Password cannot exceed 256 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      // First verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        toast.error('Unable to verify current user')
        return
      }

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        toast.error('Current password is incorrect')
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        toast.error(`Failed to update password: ${updateError.message}`)
        return
      }

      toast.success('Password updated successfully')

      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Password change error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <Input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
            maxLength={256}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <Input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (8-256 characters)"
            required
            minLength={8}
            maxLength={256}
          />
          <p className="text-xs text-gray-500 mt-1">
            {newPassword.length}/256 characters (minimum 8)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <Input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            maxLength={256}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showPasswords"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="showPasswords" className="text-sm text-gray-600">
            Show passwords
          </label>
        </div>

        <Button type="submit" isLoading={isLoading}>
          Update Password
        </Button>
      </form>
    </div>
  )
}

function PasswordResetSection({ email }: { email?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSendResetEmail = async () => {
    if (!email) {
      toast.error('No email address found')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin`,
      })

      if (error) {
        toast.error(`Failed to send reset email: ${error.message}`)
        return
      }

      setSent(true)
      toast.success('Password reset email sent! Check your inbox.')
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Password reset error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Forgot Password?</h2>
      <p className="text-gray-600 mb-4">
        If you forgot your current password, you can request a password reset email.
      </p>
      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          Password reset email sent to <strong>{email}</strong>. Check your inbox and follow the link to reset your password.
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleSendResetEmail}
          isLoading={isLoading}
        >
          Send Password Reset Email
        </Button>
      )}
    </div>
  )
}
