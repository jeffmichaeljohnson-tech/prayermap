# DRIVE-FEATURE-SPEC.md - Phase 3 Drive Mode Specification

> **PURPOSE:** Define the Drive feature for PrayerMap - a navigation mode that overlays prayer activity while driving, enabling prayer on the go.

> **Phase:** 3 (after Universal Mobile App)
> **Status:** PLANNED - Not yet in development
> **Created:** 2025-12-08

---

## Vision

**"Pray as you go."**

Drive Mode transforms commute time into prayer time. While navigating to a destination, users hear audio prayers from people along their route and can respond with voice-activated prayer.

---

## User Stories

### Primary Persona: The Commuting Prayer Warrior

**Mike, 36** - Commutes 45 minutes each way to work. Wants to make his drive time meaningful but can't look at a screen while driving.

> "I pass hundreds of people every day on my commute. What if I could pray for them while I drive? Turn my commute into a ministry."

### User Stories

1. **As a driver**, I want to hear audio prayers from people along my route, so I can pray for my community while commuting.

2. **As a driver**, I want to respond to prayers with my voice, so I can participate without touching my phone.

3. **As a driver**, I want to see a simplified HUD showing prayer activity, so I can stay aware without distraction.

4. **As a passenger**, I want to see the full prayer map while someone else drives, so I can participate fully.

---

## Core Features

### 1. Navigation Integration

**Description:** Full turn-by-turn navigation with prayer overlay.

**Implementation Options:**
- **Option A:** Mapbox Navigation SDK integration (full control)
- **Option B:** Launch Apple Maps/Google Maps with prayer companion mode
- **Option C:** Audio-only mode with background location (simplest)

**Recommended:** Option A for Phase 3 MVP, expand to CarPlay/Android Auto later.

**Key Requirements:**
- Turn-by-turn voice navigation
- Prayer audio interspersed between nav instructions
- Simple route visualization
- ETA and distance remaining

---

### 2. Audio Prayer Queue

**Description:** Automatically queue audio prayers from locations along route.

**Queue Logic:**
```
1. Calculate route waypoints
2. Query prayers within X meters of each waypoint
3. Sort by proximity to current location
4. Filter: audio prayers only (or TTS for text prayers)
5. Respect user preferences (categories, anonymous only, etc.)
```

**Playback Controls:**
- Auto-play next prayer when entering proximity
- "Skip" voice command
- "Pray for this" voice command (records response)
- Volume control (prayer vs navigation voice)

**Audio Priority:**
```
1. Critical navigation (turns, warnings)
2. Prayer audio (main content)
3. Ambient sounds (optional)
```

---

### 3. Voice-Activated Prayer Response

**Description:** Respond to prayers without touching phone.

**Voice Commands:**
| Command | Action |
|---------|--------|
| "Pray for this" | Record voice response to current prayer |
| "Skip" | Skip to next prayer |
| "Repeat" | Replay current prayer |
| "Stop prayers" | Pause prayer queue |
| "Resume prayers" | Resume prayer queue |
| "Hey PrayerMap" | Wake word (optional) |

**Response Recording:**
- Triggered by "Pray for this"
- Records for 30 seconds max
- Confirms with haptic and audio cue
- Auto-uploads when safe (stopped or on WiFi)

---

### 4. Heads-Up Display (HUD) Mode

**Description:** Minimal, glanceable interface for safety.

**HUD Elements:**
```
┌─────────────────────────────────────────┐
│                                         │
│           ← 0.5 mi - Left on Oak St     │  (Navigation)
│                                         │
│  ╔═══════════════════════════════════╗  │
│  ║                                   ║  │
│  ║        [Simplified Map]           ║  │
│  ║                                   ║  │
│  ║     🙏 · · · 🙏 · · · 🙏         ║  │  (Prayer markers)
│  ║         ↑                         ║  │  (Your position)
│  ║                                   ║  │
│  ╚═══════════════════════════════════╝  │
│                                         │
│  🙏 "Healing for my mother..."   ▶️ 🔊   │  (Current prayer)
│                                         │
│  ────────────────────────────────────   │
│  ETA: 12:45 PM  │  23 min  │  🙏 5 left │  (Status bar)
│                                         │
└─────────────────────────────────────────┘
```

**Safety Features:**
- Large touch targets only
- No text input while moving
- Auto-dim at night
- Motion detection disables complex interactions

---

### 5. Passenger Mode

**Description:** Full prayer map experience for passengers.

**Detection:**
- Manual toggle in settings
- Or: "I'm a passenger" confirmation on launch

**Passenger Features:**
- Full interactive map
- All prayer categories visible
- Normal prayer response flow
- Can browse while vehicle moving

---

## Technical Architecture

### Navigation SDK

**Mapbox Navigation SDK for React Native:**
```tsx
import MapboxNavigation from '@rnmapbox/maps-navigation';

<MapboxNavigation
  origin={userLocation}
  destination={destination}
  onLocationChange={handleLocationChange}
  onRouteProgress={handleProgress}
/>
```

### Prayer Proximity Service

**Background Location + Geofencing:**
```tsx
// Create geofences for prayers along route
const prayerGeofences = routePrayers.map(prayer => ({
  id: prayer.id,
  latitude: prayer.location.lat,
  longitude: prayer.location.lng,
  radius: 500, // meters
}));

// Trigger when entering geofence
Location.startGeofencing(prayerGeofences, ({ id, action }) => {
  if (action === 'ENTER') {
    queuePrayerAudio(id);
  }
});
```

### Voice Recognition

**Options:**
- Expo Speech Recognition (basic)
- React Native Voice (more control)
- Custom wake word with Picovoice (advanced)

```tsx
import Voice from '@react-native-voice/voice';

Voice.onSpeechResults = (results) => {
  const command = parseCommand(results.value[0]);
  handleVoiceCommand(command);
};
```

### Audio Playback Queue

```tsx
interface PrayerQueueItem {
  prayerId: string;
  audioUrl: string;
  distanceMeters: number;
  priority: number;
}

class PrayerAudioQueue {
  private queue: PrayerQueueItem[] = [];
  private isPlaying: boolean = false;

  add(item: PrayerQueueItem) { /* ... */ }
  skip() { /* ... */ }
  play() { /* ... */ }
  pause() { /* ... */ }
}
```

---

## Safety Considerations

### CRITICAL: Driver Safety First

**Legal Compliance:**
- Must comply with distracted driving laws
- Follow Apple CarPlay and Android Auto guidelines
- No video playback while vehicle in motion
- Minimal visual attention required

**Safety Features:**
1. **Speed Detection** - Disable complex interactions above 10 mph
2. **Touch Prevention** - Large buttons only while moving
3. **Voice Primary** - All interactions possible via voice
4. **Auto-Pause** - Pause prayers during critical navigation
5. **Night Mode** - Auto-dim to reduce eye strain

**Liability:**
- Terms of service must include driver responsibility disclaimer
- "Use only when safe" warnings
- Encourage passenger mode for full experience

---

## CarPlay / Android Auto (Future)

### CarPlay Integration

**Requirements:**
- Audio app template (NPAudioApp)
- Now Playing integration
- Voice control via Siri

**Limitations:**
- No custom map (uses Apple Maps)
- Limited UI templates
- Must follow Apple HIG

### Android Auto Integration

**Requirements:**
- Media app template
- Google Assistant integration
- Auto-optimized layouts

**Benefits:**
- In-car display integration
- Steering wheel controls
- Voice via Google Assistant

---

## Phase 3 Roadmap

### 3.1: Audio-Only MVP
- Route prayer queue (audio prayers along route)
- Basic voice commands (skip, pray)
- Background location tracking
- Simple HUD (current prayer + progress)

### 3.2: Full Navigation
- Mapbox Navigation integration
- Turn-by-turn with prayer interleaving
- Enhanced HUD
- Voice-recorded responses

### 3.3: Platform Integration
- CarPlay support
- Android Auto support
- Siri/Assistant shortcuts

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Drive sessions per user per week | 3+ |
| Prayers heard per drive session | 5+ |
| Voice responses per session | 1+ |
| Route completion rate | 95% |
| Crash-free rate during Drive | 99.9% |

---

## Dependencies

### Phase 2 Prerequisites
- ✅ Universal mobile app deployed
- ✅ Audio prayer recording working
- ✅ Background location permissions
- ✅ Push notification infrastructure

### New Requirements
- Mapbox Navigation SDK license
- Voice recognition library
- Background audio playback
- CarPlay/Android Auto developer accounts

---

## Open Questions

1. **Text-to-Speech for text prayers?** - Should we generate audio for text-only prayers?
2. **Prayer density** - What if there are 100 prayers on a route? Limit to top N?
3. **International** - How to handle non-English prayers?
4. **Privacy** - Should prayers along route be more anonymous?
5. **Monetization** - Premium Drive mode feature?

---

## Related Documentation

- **[MOBILE-STRATEGY.md](./MOBILE-STRATEGY.md)** - Phase 2 mobile foundation
- **[PRD.md](./PRD.md)** - Product requirements
- **[ANIMATION-SPEC.md](./ANIMATION-SPEC.md)** - HUD animations

---

**Last Updated:** 2025-12-08
**Version:** 1.0
**Status:** PLANNED
