# Data TestID Requirements for E2E Testing

This document lists all `data-testid` attributes that should be added to components for reliable E2E testing.

## Authentication Components

### AuthModal.tsx
- `auth-button` - Main authentication button/trigger
- `login-tab` - Login tab button
- `signup-tab` - Sign up tab button
- `name-input` - Name input field
- `email-input` - Email input field
- `password-input` - Password input field
- `submit-button` - Submit/Enter button
- `apple-signin-button` - Sign in with Apple button
- `error-message` - Error message container
- `success-message` - Success message container

## Map Components

### PrayerMap.tsx
- `prayer-map` - Main map container
- `map-canvas` - Mapbox canvas element
- `user-marker` - User location marker
- `settings-button` - Settings button
- `inbox-button` - Inbox button

### PrayerMarker.tsx
- `prayer-marker` - Individual prayer marker on map
- `cluster-marker` - Cluster marker for grouped prayers

### PrayerConnection.tsx
- `prayer-connection` - Connection line between prayers
- `connection-line` - Visual connection element

## Prayer Request Components

### RequestPrayerModal.tsx
- `request-prayer-button` - Button to open prayer request modal
- `prayer-modal` - Main modal container
- `close-modal` - Close button
- `text-type-button` - Text content type selector
- `audio-type-button` - Audio content type selector
- `video-type-button` - Video content type selector
- `prayer-title` - Title input field
- `prayer-content` - Content textarea
- `anonymous-switch` - Anonymous toggle switch
- `submit-prayer` - Submit prayer button

### AudioRecorder.tsx
- `audio-recorder` - Audio recorder container
- `record-button` - Start recording button
- `stop-button` - Stop recording button
- `play-button` - Play recorded audio button
- `recording-duration` - Duration display
- `audio-player` - Audio playback element

### VideoRecorder.tsx
- `video-recorder` - Video recorder container
- `video-preview` - Video preview element
- `video-record-button` - Start video recording button
- `video-stop-button` - Stop video recording button
- `flip-camera` - Camera flip button
- `progress-ring` - Recording progress indicator

## Prayer Detail Components

### PrayerDetailModal.tsx
- `prayer-detail-modal` - Prayer detail modal container
- `prayer-detail` - Prayer detail content
- `respond-button` - Respond to prayer button
- `quick-pray-button` - Quick pray button (🙏)
- `audio-response` - Audio response button
- `video-response` - Video response button

## Inbox Components

### InboxModal.tsx
- `inbox-modal` - Inbox modal container
- `close-inbox` - Close inbox button
- `inbox-message` - Individual message item
- `response-list` - List of responses
- `unread-badge` - Unread count badge

## Animation Components

### PrayerAnimationLayer.tsx
- `spotlight` - Spotlight animation element
- `prayer-animation` - General prayer animation container

## Other Components

### SettingsScreen.tsx
- `settings-screen` - Settings screen container
- `sign-out-button` - Sign out button

### LoadingScreen.tsx
- `loading-screen` - Loading screen container

## Usage in Components

Add data-testid attributes like this:

```tsx
// Button example
<button data-testid="request-prayer-button" onClick={handleClick}>
  Request Prayer
</button>

// Input example
<input
  data-testid="prayer-title"
  placeholder="Title"
  value={title}
  onChange={handleChange}
/>

// Container example
<div data-testid="prayer-modal">
  {/* Modal content */}
</div>
```

## Priority Levels

### High Priority (Required for critical tests)
- Authentication elements (login, signup, inputs)
- Prayer creation elements (modal, inputs, submit)
- Map elements (canvas, markers)

### Medium Priority (Important for feature tests)
- Inbox elements
- Prayer detail elements
- Response elements

### Low Priority (Nice to have)
- Animation elements
- Visual feedback elements

## Notes

- Use kebab-case for all data-testid values
- Keep names descriptive but concise
- Avoid dynamic or generated IDs
- Use consistent naming across similar components
- Update this document when adding new testable elements
