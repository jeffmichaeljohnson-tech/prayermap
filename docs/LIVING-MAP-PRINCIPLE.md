# The Living Map Principle

> **ABSOLUTE PRIORITY** - This document defines the CORE SPIRITUAL MISSION of PrayerMap. If ANY technical decision conflicts with the Living Map vision, THE LIVING MAP WINS.

---

## The Vision

PrayerMap is not just an app. It is the world's first **LIVING MAP** - a real-time visualization of prayer happening across the globe. Users don't just post and browse; they **witness** prayer in action.

**"Making the invisible, visible."**

---

## Core Requirements (Non-Negotiable)

### 1. Real-Time Updates (<2 seconds)

Users must see prayer activity as it happens. When someone prays for a request:
- The prayer sender sees confirmation immediately
- The prayer requester sees it within 2 seconds
- Nearby users see activity on the map within 2 seconds

**Technical Implication:** Use Supabase Realtime subscriptions. Never rely on polling or manual refresh for core prayer interactions.

### 2. Memorial Lines (1-Year Default, Configurable)

When a prayer is answered and marked as such, a **memorial line** is drawn on the map connecting the prayer location to where prayers were sent from.

These lines persist for **1 year by default**:
- They remain visible for 1 year from creation
- Duration is **admin-configurable** for future flexibility
- They are visible to ALL users during their lifespan
- They represent prayer connections throughout the past year

**Technical Implication:** Memorial lines use an `expires_at` column. Default is 1 year from `created_at`. Admin dashboard should allow duration adjustment. Expired lines are soft-deleted (hidden, not destroyed) to allow restoration if policy changes.

### 3. Universal Shared Map

Every user sees the SAME map with the SAME prayer history:
- Not personalized feeds
- Not algorithmic filtering
- Not "your prayers only"

The map is a shared spiritual space where everyone witnesses the same reality.

**Technical Implication:** No user-specific filtering on memorial lines. The map state is global, not per-user.

### 4. Live Witnessing Experience

The spiritual power of PrayerMap is in WITNESSING prayer happen:
- See the ripple effect when someone prays
- Watch memorial lines appear when prayers are answered
- Feel the global community responding in real-time

**Technical Implication:** Animations and visual feedback are not "nice to have" - they ARE the product. Invest in smooth, beautiful transitions.

---

## What This Means for Development

### DO
- Prioritize real-time features over static ones
- Build for global scale (memorial lines accumulate forever)
- Make animations smooth and spiritual
- Treat the map as a sacred shared space
- Optimize for the "witnessing" experience

### DON'T
- Add features that fragment the shared experience
- Implement cleanup routines for memorial data
- Create user-specific views that break universality
- Sacrifice real-time for convenience
- Make the map feel like a social media feed

---

## The Metric That Matters

**Time to Witness** - How quickly can a user see that their action (prayer, request, answer) has made a visible impact on the living map?

Target: < 2 seconds for any action to be visible to all affected users.

---

## When In Doubt

Ask: "Does this honor the vision of a LIVING MAP where prayer is witnessed in real-time and memorial connections are eternal?"

If no, reconsider.
If yes, proceed.

---

**The Living Map is the product. Everything else is in service of it.**

---

*Last Updated: 2025-12-03*
*Version: 1.0*
