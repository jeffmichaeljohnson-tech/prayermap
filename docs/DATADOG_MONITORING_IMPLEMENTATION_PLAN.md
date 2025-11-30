# Datadog Monitoring Implementation Plan

## 🎯 Priority Order

### Phase 1: Messaging Monitoring (CRITICAL - Week 1)
**Why First**: Critical for Living Map real-time features

**Tasks**:
1. ✅ Integrate `RealtimeMonitor` into all Supabase subscriptions
2. ✅ Add message delivery tracking to messaging services
3. ✅ Create Datadog dashboard for messaging metrics
4. ✅ Set up alerts for connection failures and slow delivery

**Files to Update**:
- `src/services/messaging/MessagingChannelManager.ts`
- `src/services/inboxSyncService.ts`
- `src/hooks/useConversationManager.ts`
- `src/lib/supabase-traced.ts` (update channel wrapper)

**Expected Impact**:
- Full visibility into real-time message delivery
- Early detection of WebSocket connection issues
- Performance optimization of messaging system

---

### Phase 2: Animation Monitoring (HIGH - Week 2)
**Why Second**: Critical for 60fps spiritual experience

**Tasks**:
1. ✅ Add `AnimationMonitor` to critical animations
2. ✅ Wrap Framer Motion components with `TracedMotion`
3. ✅ Track layout shifts globally
4. ✅ Create Datadog dashboard for animation metrics
5. ✅ Set up alerts for low FPS and high jank

**Files to Update**:
- `src/components/PrayerAnimationLayer.tsx`
- `src/components/PrayerCard.tsx` (if animated)
- `src/App.tsx` (initialize layout shift tracking)
- All Framer Motion components

**Expected Impact**:
- Ensure 60fps target maintained
- Detect animation performance issues early
- Optimize animations for mobile devices

---

### Phase 3: Backend Monitoring (MEDIUM - Week 3)
**Why Third**: Important but less critical than real-time features

**Tasks**:
1. ✅ Add API endpoint tracing to all services
2. ✅ Track RLS policy performance impact
3. ✅ Monitor Edge Functions (if using)
4. ✅ Create Datadog dashboard for backend metrics
5. ✅ Set up alerts for slow queries and high latency

**Files to Update**:
- `src/services/prayerService.ts`
- `src/services/userService.ts`
- All service files with Supabase queries

**Expected Impact**:
- Identify slow API endpoints
- Optimize database queries
- Reduce backend latency

---

## 📋 Quick Implementation Checklist

### Messaging (Do This First)
- [ ] Import `realtimeMonitor` in messaging services
- [ ] Call `realtimeMonitor.monitorChannel()` for each subscription
- [ ] Add `trackMessageSent()` and `trackMessageReceived()` calls
- [ ] Verify metrics appear in Datadog dashboard
- [ ] Set up alerts for connection failures

### Animations (Do This Second)
- [ ] Import `animationMonitor` in animation components
- [ ] Call `animationMonitor.start()` when animation begins
- [ ] Call `animationMonitor.stop()` when animation ends
- [ ] Add `trackLayoutShifts()` to App.tsx
- [ ] Verify FPS metrics appear in Datadog
- [ ] Set up alerts for low FPS

### Backend (Do This Third)
- [ ] Wrap all service functions with `traceSupabaseQuery()`
- [ ] Add metadata to traces (table, operation type)
- [ ] Verify query traces appear in Datadog
- [ ] Set up alerts for slow queries

---

## 🚀 Getting Started

**Start with messaging monitoring** - it's the most critical for the Living Map principle.

1. **Read**: `src/lib/realtime-monitor.ts` (already created)
2. **Update**: Your messaging services to use it
3. **Test**: Send a message and check Datadog dashboard
4. **Verify**: Metrics appear correctly

**Then move to animations**, then backend.

---

**Ready to implement? Let me know which phase you want to start with!**

