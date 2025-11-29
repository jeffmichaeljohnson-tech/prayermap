# Mobile Animation Testing Guide

## Overview

The 6-second prayer animation is a signature feature that must perform flawlessly on mobile devices. This guide covers testing procedures for iOS and Android via Capacitor.

## Test Devices

### Minimum Test Matrix

| Device | OS Version | Category |
|--------|------------|----------|
| iPhone SE (2nd gen) | iOS 15+ | Low-end iOS |
| iPhone 12 | iOS 16+ | Mid-range iOS |
| iPhone 14 Pro | iOS 17+ | High-end iOS |
| Pixel 4a | Android 12+ | Low-end Android |
| Pixel 7 | Android 13+ | Mid-range Android |
| Samsung S23 | Android 14+ | High-end Android |

### Testing Environments

1. **Simulator/Emulator** - Initial verification
2. **Physical Device (Debug)** - Performance testing
3. **Physical Device (Release)** - Final verification

## Pre-Test Setup

### iOS

```bash
# Build and sync
npm run build && npx cap sync ios

# Open in Xcode
npx cap open ios

# Run on device
# Select your device in Xcode, then Run (⌘R)
```

### Android

```bash
# Build and sync
npm run build && npx cap sync android

# Open in Android Studio
npx cap open android

# Run on device
# Select your device in Android Studio, then Run
```

## Test Cases

### TC-001: Animation Triggers Correctly

**Steps:**
1. Open app and allow location permission
2. Tap on a prayer marker on the map
3. In the prayer detail modal, tap "Pray First. Then Press."
4. Observe animation

**Expected:**
- Modal closes
- Map camera adjusts to show both locations
- Animation plays for 6 seconds
- Memorial line appears at end

**Pass Criteria:**
- [ ] Animation starts within 500ms of button press
- [ ] No visual glitches or jumps
- [ ] Animation completes without freezing

---

### TC-002: 60 FPS Performance

**Steps:**
1. Enable developer mode / GPU profiling
2. Trigger prayer animation
3. Monitor frame rate throughout

**Expected:**
- Consistent 60 FPS (may drop briefly on low-end)
- No major frame drops (>100ms)

**Tools:**
- iOS: Instruments > Core Animation FPS
- Android: Developer Options > Profile GPU Rendering

**Pass Criteria:**
- [ ] Average FPS > 55
- [ ] No drops below 30 FPS
- [ ] No visible stutter

---

### TC-003: Haptic Feedback

**Steps:**
1. Ensure device haptics are enabled
2. Trigger prayer animation
3. Feel for haptic feedback at key moments

**Expected Haptic Timeline:**
- 0s: Light tap (animation start)
- 2.4s: Double tap (connection)
- 5.8s: Success haptic (complete)

**Pass Criteria:**
- [ ] Haptics trigger at correct times
- [ ] Feedback feels appropriate (not too strong/weak)
- [ ] No haptics when reduced motion is enabled

---

### TC-004: Reduced Motion

**Steps:**
1. Enable "Reduce Motion" in device settings
   - iOS: Settings > Accessibility > Motion > Reduce Motion
   - Android: Settings > Accessibility > Remove animations
2. Trigger prayer animation

**Expected:**
- Animation completes in ~500ms
- No particle effects or spotlights
- Line appears immediately
- No haptic feedback

**Pass Criteria:**
- [ ] Animation respects reduced motion setting
- [ ] User experience is still meaningful
- [ ] No jarring visual changes

---

### TC-005: Low Battery / Power Saver

**Steps:**
1. Enable Low Power Mode / Battery Saver
2. Trigger prayer animation

**Expected:**
- Animation still plays (may be simplified)
- No crashes or hangs
- Reasonable performance

**Pass Criteria:**
- [ ] Animation completes successfully
- [ ] No excessive battery drain
- [ ] App remains responsive

---

### TC-006: Background/Foreground Transition

**Steps:**
1. Trigger prayer animation
2. At ~3 seconds, press home button (background app)
3. Wait 2 seconds
4. Return to app

**Expected:**
- Animation state is handled gracefully
- No crash or freeze
- Map is in correct state

**Pass Criteria:**
- [ ] App doesn't crash
- [ ] Animation either completes or resets cleanly
- [ ] Memorial line appears if animation was near completion

---

### TC-007: Screen Rotation

**Steps:**
1. Start in portrait mode
2. Trigger prayer animation
3. Rotate device during animation

**Expected:**
- Animation adjusts to new orientation
- Positions recalculate correctly
- No visual glitches

**Pass Criteria:**
- [ ] Animation handles rotation
- [ ] Line endpoints remain correct
- [ ] No crashes

---

### TC-008: Network Interruption

**Steps:**
1. Trigger prayer animation
2. Toggle airplane mode during animation

**Expected:**
- Animation continues (client-side)
- Server update handled gracefully after reconnection
- User feedback if connection lost

**Pass Criteria:**
- [ ] Animation plays fully
- [ ] No UI freeze
- [ ] Data syncs after reconnection

---

### TC-009: Memory Usage

**Steps:**
1. Open app fresh
2. Note memory usage
3. Trigger 5 prayer animations in sequence
4. Check memory usage

**Expected:**
- Memory doesn't grow unbounded
- Cleanup happens between animations
- No memory leaks

**Tools:**
- iOS: Xcode > Debug Navigator > Memory
- Android: Android Studio > Profiler > Memory

**Pass Criteria:**
- [ ] Memory returns to baseline after animation
- [ ] No leaked objects
- [ ] App doesn't get killed by OS

---

### TC-010: Audio (if enabled)

**Steps:**
1. Enable sound in app settings
2. Trigger prayer animation
3. Listen for audio cues

**Expected:**
- Sounds play at correct times
- Volume is appropriate (not jarring)
- Sounds don't overlap incorrectly

**Pass Criteria:**
- [ ] Audio plays when enabled
- [ ] No audio when device is muted
- [ ] Audio stops if app is backgrounded

---

## Bug Report Template

```markdown
## Bug: [Brief Description]

**Device:** [e.g., iPhone 14 Pro]
**OS Version:** [e.g., iOS 17.1]
**App Version:** [e.g., 1.0.0]

### Steps to Reproduce
1.
2.
3.

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Screenshots/Video
[Attach if applicable]

### Console Logs
```
[Paste relevant logs]
```

### Additional Context
[Any other relevant info]
```

## Performance Benchmarks

### Target Metrics

| Metric | Target | Acceptable | Fail |
|--------|--------|------------|------|
| Animation FPS | >58 | >50 | <45 |
| Start latency | <200ms | <500ms | >1000ms |
| Memory increase | <20MB | <50MB | >100MB |
| Battery per anim | <0.1% | <0.2% | >0.5% |

### Recording Performance

Use these commands to capture performance data:

**iOS:**
```bash
# Attach Instruments to running app
xcrun instruments -t "Core Animation" -D ~/Desktop/animation_trace.trace
```

**Android:**
```bash
# Capture systrace
adb shell "perfetto -o /data/misc/perfetto-traces/trace.pb -t 10s gfx"
adb pull /data/misc/perfetto-traces/trace.pb ~/Desktop/
```

## Sign-Off Checklist

Before release, verify:

- [ ] All test cases pass on minimum spec devices
- [ ] Performance benchmarks met
- [ ] No crash reports in testing
- [ ] Accessibility verified
- [ ] Memory leaks checked
- [ ] Battery impact acceptable

**Tested By:** _________________
**Date:** _________________
**Build:** _________________
