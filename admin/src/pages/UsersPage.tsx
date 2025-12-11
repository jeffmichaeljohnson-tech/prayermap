/**
 * Users Management Page
 * View and manage users from the admin dashboard
 */

import { useState } from 'react'
import { useUsers, useUpdateUser, useDeleteUser, type AdminUser } from '../hooks/useUsers'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/confirm-dialog'

export function UsersPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)

  const pageSize = 10
  const { data, isLoading, error } = useUsers({ page, pageSize, search })
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Sign In</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeletingUser(user)}
                          disabled={user.is_admin}
                          title={user.is_admin ? 'Cannot delete admin users' : 'Delete user'}
                        >
                          Delete
                        </Button>
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

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={async () => {
          if (!deletingUser) return
          await deleteUser.mutateAsync(deletingUser.id)
          setDeletingUser(null)
        }}
        title="Delete User"
        description={`Are you sure you want to delete ${deletingUser?.email || 'this user'}? This will permanently delete their account, all their prayers, prayer responses, and any associated data. This action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={deleteUser.isPending}
      />
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
  if (user && displayName === '' && avatarUrl === '') {
    setDisplayName(user.display_name || '')
    setAvatarUrl(user.avatar_url || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      display_name: displayName || undefined,
      avatar_url: avatarUrl || undefined,
    })
    // Reset form
    setDisplayName('')
    setAvatarUrl('')
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
