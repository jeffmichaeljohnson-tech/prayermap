# PrayerMap Video Features Guide

## Overview

PrayerMap now includes a complete social media-inspired video prayer system with TikTok/Instagram Reels-like UX patterns. This guide covers implementation, usage, and best practices for the new video features.

## 🎯 Key Features

### ✨ Modern Social Media UX
- **Vertical 9:16 aspect ratio** optimized for mobile
- **Swipe gestures** for navigation (up/down to browse videos)
- **Tap to pause/play** with smooth animations
- **Double-tap to pray** with beautiful prayer animations
- **Safe zones** compatible with all mobile platforms
- **Auto-hide controls** for immersive viewing

### 🙏 Prayer-Specific Features
- **Spiritual aesthetic** with ethereal glass design
- **Prayer interaction animations** (floating hearts, sparkles)
- **Anonymous prayer support**
- **Prayer categories** and filtering
- **Distance-based prayer discovery**
- **Haptic feedback** on mobile interactions

### 📱 Mobile-First Design
- **iOS and Android optimized** with Capacitor
- **Touch gesture controls** (swipe, tap, double-tap)
- **Safe area support** (notch, home indicator)
- **Performance optimized** for 60fps animations
- **Offline-ready** with video preloading

## 🏗️ Architecture

### Core Components

1. **`PrayerVideoPlayer`** - Individual video player with controls
2. **`PrayerVideoFeed`** - Full-screen infinite scroll feed
3. **`PrayerVideoRecordModal`** - Social media-style video recording
4. **`useVideoFeed`** - Hook for managing video feed state

### Component Hierarchy

```
App
├── PrayerVideoFeed (Full-screen overlay)
│   └── PrayerVideoPlayer (Individual video)
├── PrayerVideoRecordModal (Recording interface)
└── PrayerDetailModal (Enhanced with video support)
```

## 🚀 Quick Start

### 1. Basic Video Feed

```tsx
import { PrayerVideoFeed } from './components/PrayerVideoFeed';
import { useVideoFeed } from './hooks/useVideoFeed';

function VideoFeedExample() {
  const { prayers, userLocation } = usePrayers();
  const [showFeed, setShowFeed] = useState(false);

  const handlePray = async (prayer: Prayer) => {
    // Handle prayer interaction
    await sendPrayerSupport(prayer.id, {
      message: 'Praying for you! 🙏',
      contentType: 'text',
      isAnonymous: false
    });
  };

  return (
    <>
      <button onClick={() => setShowFeed(true)}>
        Open Video Prayers
      </button>
      
      {showFeed && (
        <PrayerVideoFeed
          prayers={prayers}
          userLocation={userLocation}
          onClose={() => setShowFeed(false)}
          onPray={handlePray}
          onShare={(prayer) => navigator.share({ /* ... */ })}
          onReport={(prayer) => reportPrayer(prayer)}
        />
      )}
    </>
  );
}
```

### 2. Video Recording

```tsx
import { PrayerVideoRecordModal } from './components/PrayerVideoRecordModal';

function RecordingExample() {
  const [showRecord, setShowRecord] = useState(false);
  
  const handleSubmit = async (data) => {
    const videoFile = new File([data.videoBlob], 'prayer.mp4');
    
    await submitPrayer({
      title: data.title,
      content: data.description,
      content_type: 'video',
      content_file: videoFile,
      is_anonymous: data.isAnonymous,
      location: userLocation
    });
  };

  return (
    <>
      <button onClick={() => setShowRecord(true)}>
        Record Prayer Video
      </button>
      
      <PrayerVideoRecordModal
        isOpen={showRecord}
        onClose={() => setShowRecord(false)}
        onSubmit={handleSubmit}
        maxDuration={90}
      />
    </>
  );
}
```

### 3. Using the Video Feed Hook

```tsx
import { useVideoFeed } from './hooks/useVideoFeed';

function VideoFeedWithHook() {
  const {
    prayers: videoPrayers,
    currentPrayer,
    isLoading,
    hasMore,
    loadMore,
    goToNext,
    goToPrevious,
    handlePrayForVideo,
    sharePrayer,
    refreshFeed
  } = useVideoFeed({
    userLocation: { lat: 40.7128, lng: -74.0060 },
    radius: 50,
    category: 'Health'
  });

  return (
    <div>
      <p>Current: {currentPrayer?.title}</p>
      <p>Total Videos: {videoPrayers.length}</p>
      
      <button onClick={goToPrevious}>Previous</button>
      <button onClick={() => handlePrayForVideo(currentPrayer!)}>
        Pray for This
      </button>
      <button onClick={goToNext}>Next</button>
      
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          Load More
        </button>
      )}
    </div>
  );
}
```

## 📐 UI Design Patterns

### Safe Zones (Mobile Optimization)

The video components use platform-optimized safe zones:

```typescript
const SAFE_ZONES = {
  top: 140,      // Status bar + controls
  bottom: 200,   // Home indicator + controls  
  right: 120,    // Action buttons
  left: 60       // Minimal margin
};
```

### Gesture Controls

| Gesture | Action | Feedback |
|---------|---------|----------|
| Tap | Pause/Play | Visual controls |
| Double-tap | Send Prayer | Prayer animation + haptics |
| Swipe Up | Next video | Smooth transition |
| Swipe Down | Previous video | Smooth transition |
| Long press | Show details | Context menu |

### Animation Patterns

```typescript
// Prayer animation on double-tap
const prayerAnimation = {
  initial: { opacity: 0, scale: 0 },
  animate: { 
    opacity: [0, 1, 1, 0],
    scale: [0, 1.2, 1, 0.8],
    rotate: [0, 10, -10, 0]
  },
  transition: { duration: 2 }
};

// Video transition between prayers
const videoTransition = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -50 },
  transition: { duration: 0.3, ease: "easeInOut" }
};
```

## 🎨 Styling & Theming

### Glass Morphism Design System

The video components use PrayerMap's "Ethereal Glass" design:

```css
.glass-strong {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.prayer-gradient {
  background: linear-gradient(
    45deg, 
    rgba(255,215,0,0.3), 
    rgba(255,192,203,0.3), 
    rgba(147,112,219,0.3), 
    rgba(135,206,250,0.3)
  );
}
```

### Video Effects Filters

```typescript
const RECORDING_EFFECTS = [
  { name: 'Natural', filter: 'none' },
  { name: 'Warm', filter: 'sepia(20%) saturate(120%) hue-rotate(10deg)' },
  { name: 'Cool', filter: 'hue-rotate(180deg) saturate(110%)' },
  { name: 'Ethereal', filter: 'brightness(110%) contrast(90%) saturate(80%)' },
  { name: 'Vintage', filter: 'sepia(40%) contrast(120%) saturate(80%)' }
];
```

## ⚡ Performance Optimization

### Video Preloading Strategy

```typescript
// Preload adjacent videos for smooth playback
useEffect(() => {
  const preloadVideo = (index: number) => {
    const prayer = videoPrayers[index];
    if (prayer?.content_url) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = prayer.content_url;
    }
  };

  // Preload previous, current + 2 next videos
  if (currentIndex > 0) preloadVideo(currentIndex - 1);
  if (currentIndex < videoPrayers.length - 1) preloadVideo(currentIndex + 1);
  if (currentIndex < videoPrayers.length - 2) preloadVideo(currentIndex + 2);
}, [currentIndex, videoPrayers]);
```

### Infinite Scroll Implementation

```typescript
// Load more content when approaching the end
useEffect(() => {
  if (currentIndex >= videoPrayers.length - 2 && onLoadMore) {
    onLoadMore();
  }
}, [currentIndex, videoPrayers.length, onLoadMore]);
```

### Animation Performance

- Use `transform` instead of position changes (GPU accelerated)
- Limit concurrent animations to prevent jank
- Use `will-change: transform` for smooth animations
- Implement proper cleanup for animation timers

## 📱 Mobile Integration

### Capacitor Setup

Add required permissions to `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ... existing config
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    },
    Geolocation: {
      permissions: ["location"]
    },
    Haptics: {},
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    }
  }
};
```

### iOS Permissions (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>PrayerMap needs camera access to record prayer videos</string>
<key>NSMicrophoneUsageDescription</key>
<string>PrayerMap needs microphone access to record prayer audio</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>PrayerMap needs location access to show nearby prayers</string>
```

### Android Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## 🔒 Security & Privacy

### Video Content Guidelines

- **Auto-moderation**: Implement content filtering for inappropriate material
- **Reporting system**: Easy reporting for community moderation
- **Anonymous options**: Support anonymous prayer posting
- **Content warnings**: Display warnings for sensitive content

### Data Privacy

- **Local storage**: Store video preferences locally
- **Minimal tracking**: Only track essential usage metrics
- **GDPR compliance**: Proper consent management
- **Data retention**: Automatic cleanup of old video data

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Test video player controls
describe('PrayerVideoPlayer', () => {
  it('should pause/play on tap', () => {
    const { getByRole } = render(<PrayerVideoPlayer {...props} />);
    const video = getByRole('video');
    
    fireEvent.click(video);
    expect(video.paused).toBe(true);
    
    fireEvent.click(video);
    expect(video.paused).toBe(false);
  });
  
  it('should trigger prayer animation on double tap', () => {
    const onPray = jest.fn();
    const { getByRole } = render(
      <PrayerVideoPlayer onPray={onPray} {...props} />
    );
    
    const video = getByRole('video');
    fireEvent.doubleClick(video);
    
    expect(onPray).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

```typescript
test('video feed navigation', async ({ page }) => {
  await page.goto('/video-feed');
  
  // Test swipe navigation
  await page.locator('[data-testid="video-player"]').swipe('up');
  await expect(page.locator('[data-testid="video-counter"]'))
    .toContainText('2 / ');
    
  // Test prayer interaction
  await page.locator('[data-testid="video-player"]').dblclick();
  await expect(page.locator('[data-testid="prayer-animation"]'))
    .toBeVisible();
});

test('video recording flow', async ({ page, browserName }) => {
  // Skip on webkit due to media permissions complexity
  test.skip(browserName === 'webkit');
  
  await page.goto('/record');
  
  // Grant camera permissions
  await page.context().grantPermissions(['camera', 'microphone']);
  
  // Start recording
  await page.locator('[data-testid="record-button"]').click();
  await page.waitForTimeout(2000);
  
  // Stop recording
  await page.locator('[data-testid="stop-button"]').click();
  
  // Verify preview
  await expect(page.locator('[data-testid="video-preview"]'))
    .toBeVisible();
});
```

### Mobile Testing

- **Device testing**: Test on actual iOS and Android devices
- **Performance testing**: Monitor frame rates and memory usage
- **Network testing**: Test with poor connectivity conditions
- **Battery testing**: Ensure efficient power consumption

## 🚀 Deployment

### Build Process

```bash
# Build for production
npm run build

# Sync with native projects
npx cap sync

# Build native apps
npx cap build ios
npx cap build android
```

### CDN Optimization

- **Video compression**: Optimize video files for streaming
- **Progressive loading**: Load videos progressively
- **Adaptive bitrate**: Serve appropriate quality based on connection
- **Edge caching**: Cache videos at edge locations

## 📊 Analytics & Monitoring

### Key Metrics to Track

1. **Video Engagement**
   - Play rate (videos started vs. loaded)
   - Completion rate (videos watched to end)
   - Prayer interaction rate (double-taps per view)
   - Swipe-through rate (how quickly users browse)

2. **Performance Metrics**
   - Video load time
   - Animation frame rate
   - App responsiveness during video playback
   - Battery usage during video sessions

3. **User Experience**
   - Session duration in video feed
   - Number of prayers sent per session
   - Feature discovery rate
   - Error rates and crash reports

### Implementation Example

```typescript
// Track video engagement
const trackVideoMetrics = (prayer: Prayer, action: string) => {
  analytics.track('Video Interaction', {
    prayer_id: prayer.id,
    action,
    video_duration: prayer.duration,
    user_location: userLocation,
    timestamp: Date.now()
  });
};

// Track performance
const trackPerformance = (metric: string, value: number) => {
  performance.mark(`video-${metric}`);
  analytics.track('Video Performance', {
    metric,
    value,
    device_type: Capacitor.getPlatform(),
    timestamp: Date.now()
  });
};
```

## 🔧 Troubleshooting

### Common Issues

**Videos not playing on iOS**
- Check iOS video codec compatibility (H.264/HEVC)
- Ensure `playsInline` attribute is set
- Verify Content-Type headers are correct

**Gesture conflicts**
- Use `touch-action: pan-y` to prevent scrolling conflicts
- Implement proper event.preventDefault() for custom gestures
- Test gesture priority on different devices

**Performance issues**
- Implement video preloading strategically
- Use React.memo for heavy components
- Monitor memory usage during video playback
- Optimize video file sizes and formats

**Audio issues**
- Handle iOS audio autoplay restrictions
- Implement mute/unmute user controls
- Test audio with device volume settings

### Debug Tools

```typescript
// Video debug overlay
const VideoDebugOverlay = ({ prayer, metrics }) => (
  <div className="absolute top-4 left-4 glass p-2 text-xs">
    <p>Video: {prayer.id}</p>
    <p>Duration: {metrics.duration}s</p>
    <p>Loaded: {metrics.loaded ? '✅' : '❌'}</p>
    <p>Playing: {metrics.playing ? '▶️' : '⏸️'}</p>
    <p>FPS: {metrics.fps}</p>
  </div>
);
```

## 🎯 Best Practices

### UX Guidelines

1. **Respect user intent**: Auto-pause when app loses focus
2. **Provide feedback**: Visual and haptic feedback for all interactions
3. **Maintain context**: Show prayer information clearly
4. **Enable sharing**: Make it easy to share meaningful prayers
5. **Support accessibility**: Include proper ARIA labels and keyboard navigation

### Performance Guidelines

1. **Optimize video size**: Keep videos under 10MB for mobile
2. **Preload strategically**: Only preload 2-3 adjacent videos
3. **Clean up resources**: Properly dispose of video elements
4. **Monitor memory**: Watch for memory leaks during long sessions
5. **Test on low-end devices**: Ensure performance on older hardware

### Content Guidelines

1. **Encourage authenticity**: Promote genuine prayer sharing
2. **Moderate appropriately**: Quick response to inappropriate content
3. **Support anonymity**: Respect privacy preferences
4. **Foster community**: Enable meaningful prayer connections
5. **Maintain spiritual focus**: Keep the experience centered on prayer

---

## 💡 Future Enhancements

### Planned Features

- **Prayer chains**: Connect related prayer videos
- **Live prayer sessions**: Real-time prayer broadcasting
- **Prayer reminders**: Notifications to revisit specific prayers
- **Collaborative prayers**: Multiple people praying together
- **Prayer analytics**: Insights into prayer impact and reach

### Technical Improvements

- **WebRTC integration**: Direct peer-to-peer prayer sharing
- **AI content moderation**: Automated inappropriate content detection
- **Enhanced offline support**: Download prayers for offline viewing
- **Multi-language support**: Auto-translated prayer subtitles
- **Advanced video effects**: AR filters and spiritual overlays

---

This guide provides a comprehensive foundation for implementing and using PrayerMap's video prayer features. The components are designed to be modular, performant, and spiritually meaningful while following modern social media UX patterns.