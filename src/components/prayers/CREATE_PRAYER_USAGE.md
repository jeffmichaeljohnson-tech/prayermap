# CreatePrayerModal Usage Guide

## Basic Usage

```tsx
import { useState } from 'react'
import { CreatePrayerModal } from './components/prayers'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Request Prayer
      </button>

      <CreatePrayerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          console.log('Prayer created successfully!')
          // Refresh prayers list, update map, etc.
        }}
      />
    </>
  )
}
```

## Features

- ✅ **Optional Title**: Users can add a title (max 200 chars)
- ✅ **Required Text Body**: Minimum 10 characters, maximum 500 characters
- ✅ **Anonymous Toggle**: Users can post anonymously
- ✅ **Automatic Geolocation**: Captures user's location automatically
- ✅ **Toast Notifications**: Shows success/error messages
- ✅ **Glassmorphic Design**: Follows PrayerMap design system
- ✅ **Mobile Responsive**: Works on all screen sizes

## Props

```tsx
interface CreatePrayerModalProps {
  isOpen: boolean          // Controls modal visibility
  onClose: () => void     // Called when modal closes
  onSuccess?: () => void  // Called after successful prayer creation
}
```

## Example: Integration with Map Component

```tsx
import { useState } from 'react'
import { CreatePrayerModal } from './components/prayers'
import { usePrayers } from './hooks/usePrayers'

function MapView() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { refetch } = usePrayers()

  return (
    <>
      {/* Your map component */}
      <button onClick={() => setShowCreateModal(true)}>
        + Request Prayer
      </button>

      <CreatePrayerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Refresh prayers on map
          refetch()
        }}
      />
    </>
  )
}
```

## Error Handling

The component handles these errors automatically:

- **Location Permission Denied**: Shows error message with retry option
- **Location Unavailable**: Shows error message
- **Text Too Short**: Validates before submission
- **Text Too Long**: Validates before submission
- **Not Authenticated**: Shows error toast
- **API Errors**: Shows user-friendly error messages

## Toast Notifications

The component uses the `useToast` hook internally. Toasts automatically:
- Appear in top-right corner
- Auto-dismiss after 3 seconds (4 seconds for success)
- Can be manually closed
- Support success, error, and info types

## Design System

The modal follows PrayerMap design system:
- **Fonts**: Cinzel for headings, Inter for body text
- **Colors**: Prayer purple (#D4C5F9) for primary actions
- **Glassmorphism**: Backdrop blur with semi-transparent background
- **Spacing**: 8px base unit system
- **Animations**: Smooth slide-up animation

## Phase 1 Limitations

Currently supports **TEXT only** prayers:
- ❌ Audio recording (Phase 2)
- ❌ Video recording (Phase 2)
- ❌ Reverse geocoding for city_region (Phase 2)

## Database Schema

The component creates prayers with:
- `media_type`: 'TEXT' (hardcoded for Phase 1)
- `status`: 'ACTIVE' (default)
- `location`: PostGIS POINT format (longitude latitude)
- `city_region`: null (will be reverse geocoded in Phase 2)

