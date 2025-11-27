# Admin Authentication Setup Guide

This guide explains how to set up and use the admin authentication system for the PrayerMap admin dashboard.

## Overview

The admin authentication system provides secure access control for the PrayerMap admin dashboard by:

1. Verifying user credentials via Supabase Auth
2. Checking admin privileges in the `admin_roles` table
3. Protecting admin routes from unauthorized access
4. Logging all admin actions for audit purposes

## Architecture

### Components

1. **AdminAuthContext** (`/admin/src/contexts/AdminAuthContext.tsx`)
   - Manages authentication state
   - Checks admin_roles table for privileges
   - Provides signIn/signOut functions
   - Exports `useAdminAuth()` hook

2. **ProtectedAdminRoute** (`/admin/src/components/ProtectedAdminRoute.tsx`)
   - Wraps admin routes
   - Shows loading spinner during auth check
   - Redirects to /login if not authenticated
   - Redirects to /unauthorized if not an admin

3. **LoginPage** (`/admin/src/pages/LoginPage.tsx`)
   - Professional login form
   - Email/password authentication
   - Form validation with react-hook-form + zod
   - Redirects to dashboard on successful login

4. **UnauthorizedPage** (`/admin/src/pages/UnauthorizedPage.tsx`)
   - Shown when user lacks admin privileges
   - Provides sign out option
   - Links to main app

5. **Admin Types** (`/admin/src/types/admin.ts`)
   - TypeScript definitions for admin roles
   - AdminUser, AdminRole, AuditLog interfaces

## Database Schema

### admin_roles Table

```sql
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);
```

### audit_logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Setup Instructions

### 1. Apply Database Migration

Run the admin tables migration in your Supabase project:

```bash
# Apply the migration
psql $DATABASE_URL < supabase/migrations/admin_tables.sql

# Or use Supabase CLI
supabase db push
```

### 2. Create Your First Admin User

In the Supabase SQL Editor, run:

```sql
-- First, create a user account via Supabase Auth UI or API
-- Then add them to admin_roles table

INSERT INTO admin_roles (user_id, role)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with actual user ID from auth.users
  'admin'
);
```

**To get your user ID:**

1. Go to Supabase Dashboard > Authentication > Users
2. Find your user and copy the UUID
3. Replace `YOUR_USER_ID_HERE` in the SQL above

### 3. Set Up Environment Variables

Ensure your admin app has these environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Wrap Your App with AdminAuthProvider

```tsx
// admin/src/App.tsx
import { AdminAuthProvider } from './contexts/AdminAuthContext'

function App() {
  return (
    <AdminAuthProvider>
      <Router>
        {/* Your routes */}
      </Router>
    </AdminAuthProvider>
  )
}
```

### 5. Protect Admin Routes

```tsx
// admin/src/App.tsx
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { LoginPage } from './pages/LoginPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { DashboardPage } from './pages/DashboardPage'

function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedAdminRoute>
                <DashboardPage />
              </ProtectedAdminRoute>
            }
          />

          {/* More protected routes... */}
        </Routes>
      </Router>
    </AdminAuthProvider>
  )
}
```

## Usage

### Using the Auth Hook

```tsx
import { useAdminAuth } from '../contexts/AdminAuthContext'

function MyComponent() {
  const { user, isAdmin, signOut } = useAdminAuth()

  if (!isAdmin) {
    return <div>Not authorized</div>
  }

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <p>Role: {user?.role}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### Creating Audit Logs

```tsx
import { createAuditLog } from '../lib/supabase'
import { useAdminAuth } from '../contexts/AdminAuthContext'

async function deletePrayer(prayerId: string) {
  const { user } = useAdminAuth()

  // Perform the action
  await supabase.from('prayers').delete().eq('id', prayerId)

  // Log it
  await createAuditLog({
    admin_id: user!.id,
    admin_email: user!.email,
    action: 'delete',
    entity_type: 'prayer',
    entity_id: prayerId,
    details: { reason: 'inappropriate content' }
  })
}
```

## Security Features

### Row Level Security (RLS)

- Only admins can read/write admin_roles table
- Only admins can read audit_logs table
- Audit logs are immutable (no UPDATE/DELETE)

### Admin Role Verification

The system checks `admin_roles` table on:
- Initial page load
- Every sign in
- Auth state changes

### Session Management

- Auto-refresh tokens
- Persistent sessions
- Secure session storage

## Admin Roles

### Admin

- Full access to all admin features
- Can manage other admin roles
- Can view all audit logs

### Moderator

- Can moderate content
- Can view audit logs
- Cannot manage admin roles

## Adding More Admins

As an existing admin, you can add more admins:

```sql
-- Add a new admin
INSERT INTO admin_roles (user_id, role, created_by)
VALUES (
  'new_user_id',
  'admin',  -- or 'moderator'
  auth.uid()  -- Your user ID
);
```

Or create an admin UI to manage this.

## Troubleshooting

### "You do not have admin privileges"

1. Verify user exists in `admin_roles` table:
   ```sql
   SELECT * FROM admin_roles WHERE user_id = 'your_user_id';
   ```

2. Check RLS policies are enabled:
   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'admin_roles';
   ```

### "Missing Supabase environment variables"

Ensure `.env` file exists with:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Login redirects to unauthorized

The user is authenticated but not in `admin_roles` table. Add them:

```sql
INSERT INTO admin_roles (user_id, role)
VALUES ('user_id_here', 'admin');
```

## Next Steps

1. Create admin dashboard pages
2. Add content moderation features
3. Build user management interface
4. Add analytics and reporting
5. Implement audit log viewer

## Support

For issues or questions:
- Check Supabase logs in the dashboard
- Review browser console for errors
- Verify RLS policies are correctly set up
