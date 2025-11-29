/**
 * Users Management Page
 * View and manage users from the admin dashboard
 */

import { useState, useEffect } from 'react'
import { useUsers, useUpdateUser, useBanUser, useUnbanUser, type AdminUser } from '../hooks/useUsers'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'

export function UsersPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null)
  const [unbanningUser, setUnbanningUser] = useState<AdminUser | null>(null)

  const pageSize = 10
  const { data, isLoading, error } = useUsers({ page, pageSize, search })
  const updateUser = useUpdateUser()
  const banUser = useBanUser()
  const unbanUser = useUnbanUser()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage all registered users</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search users by email or name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-md"
        />
        <Button type="submit">Search</Button>
        {search && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch('')
              setSearchInput('')
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading users: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Display Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Prayers</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Sign In</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setViewingUser(user)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {user.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.display_name || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.prayer_count}</td>
                    <td className="px-4 py-3 text-sm">
                      {user.is_admin ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {user.admin_role}
                        </span>
                      ) : (
                        <span className="text-gray-400">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.is_banned ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Banned ({user.ban_type})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {user.last_sign_in
                        ? new Date(user.last_sign_in).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                          Edit
                        </Button>
                        {user.is_banned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUnbanningUser(user)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Are you sure you want to ban ${user.email}?`)) {
                                banUser.mutate({
                                  userId: user.id,
                                  reason: 'Banned by admin',
                                  banType: 'soft',
                                })
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Ban
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.totalCount)} of{' '}
              {data.totalCount} users
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

      {/* View User Dialog */}
      <Dialog isOpen={!!viewingUser} onClose={() => setViewingUser(null)}>
        <DialogHeader onClose={() => setViewingUser(null)}>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {viewingUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ID</label>
                <p className="font-mono text-sm">{viewingUser.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p>{viewingUser.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Display Name</label>
                <p>{viewingUser.display_name || '(Not set)'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p>{viewingUser.is_admin ? viewingUser.admin_role : 'User'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Prayer Count</label>
                <p>{viewingUser.prayer_count}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p>
                  {viewingUser.is_banned ? (
                    <span className="text-red-600 font-medium">
                      Banned ({viewingUser.ban_type})
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium">Active</span>
                  )}
                </p>
              </div>
              {viewingUser.is_banned && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ban Reason</label>
                    <p>{viewingUser.ban_reason}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Banned At</label>
                    <p>{viewingUser.banned_at ? new Date(viewingUser.banned_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p>{new Date(viewingUser.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Sign In</label>
                <p>
                  {viewingUser.last_sign_in
                    ? new Date(viewingUser.last_sign_in).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              {viewingUser.avatar_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Avatar</label>
                  <img
                    src={viewingUser.avatar_url}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full mt-1"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewingUser(null)}>
            Close
          </Button>
          <Button
            onClick={() => {
              if (viewingUser) {
                setEditingUser(viewingUser)
                setViewingUser(null)
              }
            }}
          >
            Edit
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={async (updates) => {
          if (!editingUser) return
          await updateUser.mutateAsync({ id: editingUser.id, ...updates })
          setEditingUser(null)
        }}
        isLoading={updateUser.isPending}
      />

      {/* Unban User Confirmation Dialog */}
      <Dialog isOpen={!!unbanningUser} onClose={() => setUnbanningUser(null)}>
        <DialogHeader onClose={() => setUnbanningUser(null)}>
          <DialogTitle>Unban User</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {unbanningUser && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to unban <strong>{unbanningUser.email}</strong>?
              </p>
              {unbanningUser.ban_reason && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
                    <strong>Ban Reason:</strong> {unbanningUser.ban_reason}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Ban Type:</strong> {unbanningUser.ban_type}
                  </p>
                  {unbanningUser.banned_at && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Banned At:</strong> {new Date(unbanningUser.banned_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-600">
                This will allow the user to access the application again.
              </p>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setUnbanningUser(null)} disabled={unbanUser.isPending}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!unbanningUser) return
              await unbanUser.mutateAsync({
                userId: unbanningUser.id,
                note: 'Unbanned by admin',
              })
              setUnbanningUser(null)
            }}
            isLoading={unbanUser.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            Unban User
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

interface EditUserDialogProps {
  user: AdminUser | null
  onClose: () => void
  onSave: (updates: { display_name?: string; avatar_url?: string }) => Promise<void>
  isLoading: boolean
}

function EditUserDialog({ user, onClose, onSave, isLoading }: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setAvatarUrl(user.avatar_url || '')
    } else {
      setDisplayName('')
      setAvatarUrl('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      display_name: displayName || undefined,
      avatar_url: avatarUrl || undefined,
    })
    // Form will be reset when user prop becomes null via useEffect
  }

  return (
    <Dialog isOpen={!!user} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogHeader onClose={onClose}>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input value={user?.email || ''} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="User's display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
