/**
 * Content Moderation Page
 * Review flagged prayers, approve/reject content, manage user bans
 */

import { useState } from 'react'
import {
  useModerationQueue,
  useModeratePrayer,
  useBulkModeratePrayers,
  useBanUser,
  useUserBanStatus,
  type ModerationPrayer,
} from '../hooks/useModeration'
import { Button } from '../components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { Textarea } from '../components/ui/textarea'

type FilterType = 'all' | 'flagged' | 'pending'

export function ModerationPage() {
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<FilterType>('flagged')
  const [viewingPrayer, setViewingPrayer] = useState<ModerationPrayer | null>(null)
  const [moderatingPrayer, setModeratingPrayer] = useState<{
    prayer: ModerationPrayer
    action: 'approve' | 'hide' | 'remove'
  } | null>(null)
  const [moderationNote, setModerationNote] = useState('')
  const [banningUser, setBanningUser] = useState<ModerationPrayer | null>(null)
  const [selectedPrayerIds, setSelectedPrayerIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<{
    action: 'approve' | 'hide' | 'remove'
    note: string
  } | null>(null)

  const pageSize = 20
  const { data, isLoading, error } = useModerationQueue({ page, pageSize, filter })
  const moderatePrayer = useModeratePrayer()
  const bulkModeratePrayers = useBulkModeratePrayers()

  const handleModerate = (prayer: ModerationPrayer, action: 'approve' | 'hide' | 'remove') => {
    setModeratingPrayer({ prayer, action })
    setModerationNote('')
  }

  const confirmModerate = async () => {
    if (!moderatingPrayer) return

    const statusMap = {
      approve: 'active' as const,
      hide: 'hidden' as const,
      remove: 'removed' as const,
    }

    await moderatePrayer.mutateAsync({
      prayerId: moderatingPrayer.prayer.id,
      status: statusMap[moderatingPrayer.action],
      note: moderationNote || undefined,
    })

    setModeratingPrayer(null)
    setModerationNote('')
  }

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (!data?.prayers) return

    if (selectedPrayerIds.size === data.prayers.length) {
      setSelectedPrayerIds(new Set())
    } else {
      setSelectedPrayerIds(new Set(data.prayers.map(p => p.id)))
    }
  }

  const handleSelectPrayer = (prayerId: string) => {
    setSelectedPrayerIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(prayerId)) {
        newSet.delete(prayerId)
      } else {
        newSet.add(prayerId)
      }
      return newSet
    })
  }

  const handleBulkAction = (action: 'approve' | 'hide' | 'remove') => {
    setBulkAction({ action, note: '' })
  }

  const confirmBulkAction = async () => {
    if (!bulkAction) return

    const statusMap = {
      approve: 'active' as const,
      hide: 'hidden' as const,
      remove: 'removed' as const,
    }

    await bulkModeratePrayers.mutateAsync({
      prayerIds: Array.from(selectedPrayerIds),
      status: statusMap[bulkAction.action],
      note: bulkAction.note || undefined,
    })

    setSelectedPrayerIds(new Set())
    setBulkAction(null)
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      hidden: 'bg-yellow-100 text-yellow-800',
      removed: 'bg-red-100 text-red-800',
      pending_review: 'bg-blue-100 text-blue-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getFlagReasonBadge = (reason: string) => {
    const badges = {
      inappropriate: 'bg-orange-100 text-orange-800',
      spam: 'bg-purple-100 text-purple-800',
      offensive: 'bg-red-100 text-red-800',
      harassment: 'bg-pink-100 text-pink-800',
      violence: 'bg-red-200 text-red-900',
      other: 'bg-gray-100 text-gray-800',
    }
    return badges[reason as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
          <p className="text-gray-600">Review and moderate flagged prayer requests</p>
        </div>

        {/* Bulk Actions */}
        {selectedPrayerIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">
              {selectedPrayerIds.size} selected
            </span>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleBulkAction('approve')}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('hide')}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
            >
              Hide Selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('remove')}
            >
              Remove Selected
            </Button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['all', 'flagged', 'pending'] as FilterType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab)
                  setPage(0)
                }}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  filter === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'all' && 'All Items'}
                {tab === 'flagged' && 'Flagged'}
                {tab === 'pending' && 'Pending Review'}
                {data && tab === filter && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                    {data.totalCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200 text-red-700">
            Error loading moderation queue: {error.message}
          </div>
        )}

        {/* Queue List */}
        <div className="divide-y divide-gray-200">
          {/* Select All Header */}
          {!isLoading && data && data.prayers.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPrayerIds.size === data.prayers.length && data.prayers.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({data.prayers.length})
                </span>
              </label>
            </div>
          )}

          {isLoading ? (
            <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
          ) : data?.prayers.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="text-4xl mb-2">✓</div>
              <div className="text-lg font-medium">All clear!</div>
              <div className="text-sm">No items in the moderation queue</div>
            </div>
          ) : (
            data?.prayers.map((prayer) => (
              <div key={prayer.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Checkbox */}
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={selectedPrayerIds.has(prayer.id)}
                      onChange={() => handleSelectPrayer(prayer.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {prayer.title && (
                            <h3 className="font-medium text-gray-900 truncate">{prayer.title}</h3>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(prayer.status)}`}>
                            {prayer.status.replace('_', ' ')}
                          </span>
                          {prayer.flagged_count > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              {prayer.flagged_count} flags
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{prayer.content}</p>
                      </div>
                    </div>

                    {/* Flags */}
                    {prayer.flag_reasons && prayer.flag_reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-xs text-gray-500">Flagged for:</span>
                        {prayer.flag_reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 text-xs font-medium rounded ${getFlagReasonBadge(reason)}`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>
                        {prayer.is_anonymous ? 'Anonymous' : prayer.user_name || prayer.user_email || 'Unknown user'}
                      </span>
                      <span>•</span>
                      <span>{new Date(prayer.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>
                        {prayer.latitude.toFixed(2)}, {prayer.longitude.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewingPrayer(prayer)}>
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleModerate(prayer, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleModerate(prayer, 'hide')}
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    >
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleModerate(prayer, 'remove')}
                    >
                      Remove
                    </Button>
                    {!prayer.is_anonymous && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBanningUser(prayer)}
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        Ban User
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.totalCount)} of{' '}
              {data.totalCount} items
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pageCount - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Prayer Details Dialog */}
      <PrayerDetailsDialog prayer={viewingPrayer} onClose={() => setViewingPrayer(null)} />

      {/* Moderate Prayer Confirmation */}
      <Dialog isOpen={!!moderatingPrayer} onClose={() => setModeratingPrayer(null)}>
        <DialogHeader onClose={() => setModeratingPrayer(null)}>
          <DialogTitle>
            {moderatingPrayer?.action === 'approve' && 'Approve Prayer'}
            {moderatingPrayer?.action === 'hide' && 'Hide Prayer'}
            {moderatingPrayer?.action === 'remove' && 'Remove Prayer'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {moderatingPrayer?.action === 'approve' &&
                'This prayer will be visible on the public map and marked as active.'}
              {moderatingPrayer?.action === 'hide' &&
                'This prayer will be hidden from the public map but not deleted. The user can still see it.'}
              {moderatingPrayer?.action === 'remove' &&
                'This prayer will be permanently removed from the public map. This action cannot be undone.'}
            </p>
            {moderatingPrayer?.prayer && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm line-clamp-3">{moderatingPrayer.prayer.content}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <Textarea
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                placeholder="Reason for this action, additional context, etc."
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModeratingPrayer(null)} disabled={moderatePrayer.isPending}>
            Cancel
          </Button>
          <Button
            onClick={confirmModerate}
            isLoading={moderatePrayer.isPending}
            className={
              moderatingPrayer?.action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : moderatingPrayer?.action === 'remove'
                ? 'bg-red-600 hover:bg-red-700'
                : undefined
            }
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Ban User Dialog */}
      <BanUserDialog prayer={banningUser} onClose={() => setBanningUser(null)} />

      {/* Bulk Action Confirmation Dialog */}
      <Dialog isOpen={!!bulkAction} onClose={() => setBulkAction(null)}>
        <DialogHeader onClose={() => setBulkAction(null)}>
          <DialogTitle>
            {bulkAction?.action === 'approve' && 'Approve Selected Prayers'}
            {bulkAction?.action === 'hide' && 'Hide Selected Prayers'}
            {bulkAction?.action === 'remove' && 'Remove Selected Prayers'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {bulkAction?.action === 'approve' &&
                `You are about to approve ${selectedPrayerIds.size} prayer(s). They will be visible on the public map and marked as active.`}
              {bulkAction?.action === 'hide' &&
                `You are about to hide ${selectedPrayerIds.size} prayer(s). They will be hidden from the public map but not deleted.`}
              {bulkAction?.action === 'remove' &&
                `You are about to permanently remove ${selectedPrayerIds.size} prayer(s) from the public map. This action cannot be undone.`}
            </p>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">
                Selected prayers: {selectedPrayerIds.size}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <Textarea
                value={bulkAction?.note || ''}
                onChange={(e) => setBulkAction(prev => prev ? { ...prev, note: e.target.value } : null)}
                placeholder="Reason for this action, additional context, etc."
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBulkAction(null)} disabled={bulkModeratePrayers.isPending}>
            Cancel
          </Button>
          <Button
            onClick={confirmBulkAction}
            isLoading={bulkModeratePrayers.isPending}
            className={
              bulkAction?.action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : bulkAction?.action === 'remove'
                ? 'bg-red-600 hover:bg-red-700'
                : undefined
            }
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// Prayer Details Dialog Component
interface PrayerDetailsDialogProps {
  prayer: ModerationPrayer | null
  onClose: () => void
}

function PrayerDetailsDialog({ prayer, onClose }: PrayerDetailsDialogProps) {
  const { data: banStatus } = useUserBanStatus(prayer?.user_id || null)

  if (!prayer) return null

  return (
    <Dialog isOpen={!!prayer} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>Prayer Details</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className="mt-1 text-sm">
              <span className="px-2 py-1 rounded bg-gray-100">{prayer.status.replace('_', ' ')}</span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Content</label>
            <p className="mt-1 whitespace-pre-wrap">{prayer.content}</p>
          </div>
          {prayer.title && (
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="mt-1">{prayer.title}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-500">User</label>
            <p className="mt-1">
              {prayer.is_anonymous ? 'Anonymous' : prayer.user_name || prayer.user_email || 'Unknown'}
            </p>
            {banStatus?.is_banned && (
              <p className="mt-1 text-xs text-red-600">
                User is currently banned ({banStatus.ban_type})
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Location</label>
            <p className="mt-1 text-sm">
              Lat: {prayer.latitude.toFixed(6)}, Lng: {prayer.longitude.toFixed(6)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="mt-1 text-sm">{new Date(prayer.created_at).toLocaleString()}</p>
          </div>
          {prayer.flagged_count > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Flags</label>
              <p className="mt-1 text-sm">{prayer.flagged_count} flag(s)</p>
              {prayer.flag_reasons && prayer.flag_reasons.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {prayer.flag_reasons.map((reason, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {prayer.moderation_notes && prayer.moderation_notes.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Moderation History</label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {prayer.moderation_notes.map((note, idx) => (
                  <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                    <div className="font-medium">{note.action}</div>
                    <div className="text-gray-600">{note.note}</div>
                    <div className="text-gray-500 mt-1">
                      {new Date(note.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// Ban User Dialog Component
interface BanUserDialogProps {
  prayer: ModerationPrayer | null
  onClose: () => void
}

function BanUserDialog({ prayer, onClose }: BanUserDialogProps) {
  const [banType, setBanType] = useState<'soft' | 'hard'>('soft')
  const [reason, setReason] = useState('')
  const [durationDays, setDurationDays] = useState<string>('')
  const [note, setNote] = useState('')

  const banUser = useBanUser()

  const handleBan = async () => {
    if (!prayer || !reason.trim()) return

    await banUser.mutateAsync({
      userId: prayer.user_id,
      reason: reason.trim(),
      banType,
      durationDays: durationDays ? parseInt(durationDays) : null,
      note: note.trim() || undefined,
    })

    // Reset form
    setBanType('soft')
    setReason('')
    setDurationDays('')
    setNote('')
    onClose()
  }

  if (!prayer) return null

  return (
    <Dialog isOpen={!!prayer} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>Ban User</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            Warning: This will ban {prayer.user_name || prayer.user_email} from the platform.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ban Type</label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="banType"
                  value="soft"
                  checked={banType === 'soft'}
                  onChange={(e) => setBanType(e.target.value as 'soft')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">Soft Ban</div>
                  <div className="text-xs text-gray-600">Hide all user's prayers, prevent new posts</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="banType"
                  value="hard"
                  checked={banType === 'hard'}
                  onChange={(e) => setBanType(e.target.value as 'hard')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">Hard Ban</div>
                  <div className="text-xs text-gray-600">Block user from accessing the platform</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for banning this user"
              rows={2}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (days)</label>
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="Leave empty for permanent ban"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty for a permanent ban</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional context or notes"
              rows={2}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={banUser.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleBan}
          isLoading={banUser.isPending}
          disabled={!reason.trim()}
          className="bg-red-600 hover:bg-red-700"
        >
          Ban User
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
