# Observability-Driven Development (ODD) Protocol

> **Core Principle**: Data-driven decisions beat intuition. Check metrics before guessing, verify after changes, and debug with evidence.

---

## 🎯 Philosophy

**Observability-Driven Development (ODD)** means:
- **Never debug blind** - Check metrics before diagnosing
- **Verify assumptions** - Data > intuition
- **Measure impact** - See the effect of your changes
- **Fail fast** - Enable debug mode at first sign of trouble

**But also**:
- **Don't slow down trivial tasks** - Use judgment
- **Context matters** - Not every task needs full observability
- **Efficiency matters** - Balance thoroughness with speed

---

## 🚨 MANDATORY Datadog Checks

### When You MUST Check Datadog

**1. Before Debugging Any Error** ⚠️ CRITICAL
```
❌ WRONG: "I see an error, let me check the code"
✅ RIGHT: "I see an error, let me check Datadog first to understand the context"
```

**Why**: Errors in Datadog show:
- How often it occurs
- When it started
- User context
- Related errors
- Performance impact

**Action**: 
1. Go to Datadog → Logs → Search for error message
2. Check error frequency and trends
3. Review error context (user_id, component, etc.)
4. Look for related errors
5. THEN investigate code

---

**2. Before Performance Work** ⚠️ CRITICAL
```
❌ WRONG: "This feels slow, let me optimize"
✅ RIGHT: "Let me check Datadog to see actual performance metrics"
```

**Why**: Performance work without metrics is guessing:
- What's actually slow?
- How slow is it?
- Is it getting worse?
- What's the baseline?

**Action**:
1. Check Datadog → APM → Service Performance
2. Identify slowest operations
3. Review query performance (PostgreSQL)
4. Check animation FPS metrics
5. THEN optimize based on data

---

**3. After Making Changes** ⚠️ CRITICAL
```
❌ WRONG: "Code compiles, I'm done"
✅ RIGHT: "Code compiles, let me verify metrics show improvement"
```

**Why**: Changes can have unintended consequences:
- Did performance improve or degrade?
- Are errors increasing?
- Are new errors appearing?
- Is the change working as expected?

**Action**:
1. Make change
2. Wait 2-5 minutes for metrics to update
3. Check Datadog for:
   - Error rate changes
   - Performance changes
   - New errors
4. Verify improvement or investigate regression

---

**4. When Investigating User Reports** ⚠️ CRITICAL
```
❌ WRONG: "User says it's broken, let me check code"
✅ RIGHT: "User says it's broken, let me check Datadog for that user/timeframe"
```

**Why**: User reports need context:
- Is it affecting all users or just one?
- When did it start?
- What's the error pattern?
- Is it related to recent changes?

**Action**:
1. Check Datadog → Logs → Filter by user_id or timeframe
2. Review error patterns
3. Check performance metrics for that period
4. Look for related issues
5. THEN investigate code

---

**5. Before Complex Features** ⚠️ RECOMMENDED
```
✅ GOOD: "Let me check current metrics before adding this feature"
```

**Why**: Understand baseline before adding complexity:
- Current performance baseline
- Error rates
- Resource usage
- User patterns

**Action**:
1. Check relevant metrics (messaging, animations, backend)
2. Document baseline
3. Implement feature
4. Compare metrics after

---

## 🔍 OPTIONAL Datadog Checks

### When Checking is Helpful But Not Required

**1. Simple Refactors** (No behavior change)
- If no behavior changes, metrics shouldn't change
- Still good to verify, but not critical

**2. Documentation Updates**
- No code changes = no metric changes
- Skip unless documenting metrics themselves

**3. Trivial Bug Fixes** (Obvious issues)
- If error is obvious (typo, null check), fix first
- Then verify metrics show improvement

**4. Styling/CSS Changes**
- Visual changes don't affect backend metrics
- Still check animation/layout metrics if relevant

---

## 🐛 Auto-Enable Debug Mode Protocol

### When to Enable Debug Mode

**MANDATORY**: Enable debug mode on **first failure**:

```typescript
// In your code or agent workflow:
if (errorOccurred && !debugModeEnabled) {
  enableDebugMode();
  logToDatadog('Debug mode enabled due to error', { error, context });
}
```

**Why**: 
- First failure might be a fluke
- Second failure = pattern = need more data
- Debug mode provides detailed context

**Action**:
1. **First error**: Enable debug mode automatically
2. **Check Datadog**: Review detailed logs
3. **If error persists**: Debug mode already on, investigate
4. **After fix**: Disable debug mode (or leave on for 24h)

---

## 📊 What to Check in Datadog

### For Errors

**Check**:
1. **Error frequency**: How often does it occur?
2. **Error trends**: Is it increasing/decreasing?
3. **Error context**: user_id, component, action
4. **Related errors**: Are there patterns?
5. **Performance impact**: Is it slowing things down?

**Location**: Datadog → Logs → Search error message

---

### For Performance

**Check**:
1. **Query performance**: PostgreSQL slow queries
2. **API latency**: Endpoint response times
3. **Animation FPS**: Frame rate metrics
4. **Message latency**: Realtime delivery times
5. **Layout shifts**: CLS scores

**Location**: Datadog → APM → Service Performance

---

### For Messaging/Realtime

**Check**:
1. **Connection health**: % connected vs disconnected
2. **Message latency**: p50, p95, p99 delivery times
3. **Subscription errors**: Failed subscriptions
4. **Reconnection rate**: How often connections drop

**Location**: Datadog → Logs → Search "realtime"

---

### For Animations

**Check**:
1. **FPS**: Average frame rate (target: 60fps)
2. **Jank rate**: % frames >16.67ms (target: <10%)
3. **Completion variance**: Actual vs expected duration
4. **Layout shifts**: CLS score (target: <0.1)

**Location**: Datadog → Logs → Search "animation"

---

## 🎯 Agent Workflow Integration

### Standard Agent Workflow with ODD

```
1. RECEIVE TASK
   ↓
2. CHECK DATADOG (if debugging/performance/errors)
   ├─ Review relevant metrics
   ├─ Understand baseline
   └─ Identify patterns
   ↓
3. RESEARCH (query memory, check docs)
   ↓
4. IMPLEMENT
   ↓
5. VERIFY IN DATADOG (mandatory after changes)
   ├─ Check error rates
   ├─ Check performance metrics
   └─ Verify improvement
   ↓
6. DOCUMENT FINDINGS
```

---

### Error Handling Workflow

```
1. ERROR OCCURS
   ↓
2. AUTO-ENABLE DEBUG MODE (first failure)
   ↓
3. CHECK DATADOG IMMEDIATELY
   ├─ Search error message
   ├─ Check frequency/trends
   ├─ Review context
   └─ Identify patterns
   ↓
4. INVESTIGATE CODE (with context from Datadog)
   ↓
5. FIX
   ↓
6. VERIFY IN DATADOG
   ├─ Error should stop
   ├─ Performance should improve
   └─ No new errors
   ↓
7. DISABLE DEBUG MODE (after 24h if stable)
```

---

## 📋 Quick Reference Checklist

### Before Starting Work

- [ ] **If debugging**: Check Datadog for error context
- [ ] **If performance**: Check Datadog for baseline metrics
- [ ] **If user report**: Check Datadog for user-specific logs
- [ ] **If complex feature**: Check Datadog for current state

### During Work

- [ ] **If error occurs**: Auto-enable debug mode
- [ ] **If stuck**: Check Datadog for clues
- [ ] **If unsure**: Check Datadog for patterns

### After Work

- [ ] **Always**: Verify metrics show improvement
- [ ] **Always**: Check for new errors
- [ ] **Always**: Verify performance didn't degrade
- [ ] **If debug enabled**: Leave on for 24h, then disable

---

## 🚫 When NOT to Check Datadog

**Don't check for**:
- Simple typos or syntax errors
- Documentation-only changes
- Trivial refactors with no behavior change
- Styling changes (unless animation-related)
- Initial setup/installation

**Use judgment**: If checking Datadog would take longer than fixing the issue, skip it.

---

## 💡 Best Practices

### 1. Check Before Guessing
```
❌ "This might be slow because..."
✅ "Datadog shows this is slow because..."
```

### 2. Verify After Changes
```
❌ "I fixed it"
✅ "I fixed it, and Datadog confirms error rate dropped from X to Y"
```

### 3. Enable Debug Early
```
❌ "Let me try a few things first"
✅ "First error = enable debug mode, then investigate"
```

### 4. Use Metrics to Prioritize
```
❌ "This feels important"
✅ "Datadog shows this affects 50% of users, so it's high priority"
```

### 5. Document Findings
```
✅ "Datadog showed error rate of X before fix, Y after fix"
✅ "Performance improved from Xms to Yms according to Datadog"
```

---

## 🎓 Examples

### Example 1: Debugging an Error

**Scenario**: User reports "messages not sending"

**WRONG Approach**:
```
1. Check code
2. Try to reproduce
3. Guess at fix
```

**RIGHT Approach**:
```
1. Check Datadog → Logs → Search "message send"
   - See error frequency: 15% of messages failing
   - See error type: "realtime connection timeout"
   - See pattern: Only affects users with >10 active channels
2. Enable debug mode (auto-enabled on first error)
3. Check Datadog → Realtime metrics
   - See connection health: 85% connected (should be >95%)
   - See reconnection rate: High
4. Investigate code with context
5. Fix connection pooling issue
6. Verify in Datadog: Error rate drops to 0.5%
```

---

### Example 2: Performance Optimization

**Scenario**: "App feels slow"

**WRONG Approach**:
```
1. Optimize random code
2. Hope it helps
```

**RIGHT Approach**:
```
1. Check Datadog → APM → Service Performance
   - See slowest operation: "getPrayers" taking 2.5s
   - See query performance: PostgreSQL query taking 2.3s
2. Check Datadog → PostgreSQL → Slow Queries
   - See query: Missing index on location column
3. Add index
4. Verify in Datadog: Query time drops to 200ms
5. Verify in Datadog: Overall "getPrayers" drops to 400ms
```

---

### Example 3: Animation Performance

**Scenario**: "Animations feel janky"

**WRONG Approach**:
```
1. Reduce animation complexity
2. Hope it helps
```

**RIGHT Approach**:
```
1. Check Datadog → Logs → Search "animation"
   - See FPS: 45fps (target: 60fps)
   - See jank rate: 25% (target: <10%)
   - See specific animation: "prayer_send_animation" worst
2. Enable debug mode for animation monitoring
3. Check Datadog → Animation metrics
   - See frame times: Many frames >20ms
   - See GPU usage: High
4. Optimize animation (reduce complexity, use GPU acceleration)
5. Verify in Datadog: FPS improves to 58fps, jank drops to 8%
```

---

## 🔧 Implementation in Agent Rules

### Add to Core Rules

```markdown
## Observability-Driven Development

### Mandatory Datadog Checks
- **Before debugging**: Check Datadog for error context
- **Before performance work**: Check Datadog for baseline metrics
- **After changes**: Verify metrics show improvement
- **On first error**: Auto-enable debug mode

### What to Check
- Error frequency and trends
- Performance metrics (latency, FPS, etc.)
- User context (user_id, component, etc.)
- Related errors and patterns

### When NOT to Check
- Simple typos/syntax errors
- Documentation-only changes
- Trivial refactors
- Use judgment: if checking takes longer than fixing, skip
```

---

## ✅ Success Criteria

**ODD is working when**:
- ✅ Agents check Datadog before debugging (not after)
- ✅ Agents verify metrics after changes (not just code)
- ✅ Debug mode auto-enables on first error
- ✅ Decisions are data-driven (not intuition-based)
- ✅ Performance work starts with metrics (not guesses)

---

## 📚 Related Documentation

- **Monitoring Guide**: [MONITORING-GUIDE.md](./MONITORING-GUIDE.md)
- **Datadog Setup**: [DATADOG_COMPLETE_MONITORING_SETUP.md](./DATADOG_COMPLETE_MONITORING_SETUP.md)
- **Agent Rules**: [.cursor/rules/core-rules.mdc](../.cursor/rules/core-rules.mdc)

---

**Remember**: Data-driven decisions beat intuition. Check metrics before guessing, verify after changes, and debug with evidence.

