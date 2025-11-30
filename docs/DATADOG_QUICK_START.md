# Datadog Full-Stack Debugging - Quick Start

> **Problem Solved**: Agents can't debug chat/messaging because they need to see BOTH frontend (React) AND backend (Supabase queries, WebSocket connections).

---

## 🚀 5-Minute Setup

### Step 1: Install Packages

```bash
npm install @datadog/browser-rum @datadog/browser-rum-react
```

### Step 2: Get Datadog Credentials

1. Sign up at https://www.datadoghq.com (free tier available)
2. Go to **RUM** → **Application Settings**
3. Create a new application: "PrayerMap"
4. Copy your **Application ID** and **Client Token**

### Step 3: Add Environment Variables

Add to `.env`:
```bash
VITE_DATADOG_APP_ID=your_application_id_here
VITE_DATADOG_CLIENT_TOKEN=your_client_token_here
VITE_DATADOG_ENABLE_DEV=true  # Set to false in production
```

### Step 4: Initialize Datadog

The Datadog client is already configured in `src/lib/datadog.ts` and auto-initializes.

**To use traced Supabase client**:
```typescript
// Instead of:
import { supabase } from '@/lib/supabase';

// Use:
import { tracedSupabase } from '@/lib/supabase-traced';

// All queries are automatically traced
const { data } = await tracedSupabase.from('prayers').select('*');
```

### Step 5: Verify It Works

1. **Start your app**: `npm run dev`
2. **Perform an action** (e.g., send a message)
3. **Check Datadog dashboard**: https://app.datadoghq.com/rum/explorer
4. **You should see**:
   - User sessions
   - Page views
   - Supabase queries
   - Errors (if any)

---

## 🎯 How Agents Use This

### Debugging Chat/Messaging Issues

**Before (No Visibility)**:
```
❌ Agent: "Bug fixed!"
❌ Reality: Still broken, no way to verify
```

**After (Full Visibility)**:
```typescript
// Agent can see complete flow:
1. User clicks "Send Message" → Frontend action tracked
2. React component calls tracedSupabase → Query traced
3. Supabase query executes → Database operation traced
4. WebSocket message sent → Realtime connection traced
5. Error occurs → Automatically linked to query that caused it

// Agent sees in Datadog:
- Frontend error: "Cannot read property 'id'"
- Linked to: Supabase query "insert.prayer_responses"
- Root cause: RLS policy blocking insert
- Fix: Update RLS policy
```

### Example: Debugging Message Delivery

```typescript
// In your code
import { tracedSupabase } from '@/lib/supabase-traced';

// Send message
const { data, error } = await tracedSupabase
  .from('prayer_responses')
  .insert({ prayer_id, message: 'Hello' });

// In Datadog, agent sees:
// 1. Frontend: User clicked "Send"
// 2. Query: INSERT INTO prayer_responses
// 3. Database: Query executed in 45ms
// 4. Error: RLS policy violation
// 5. Root cause: User doesn't have INSERT permission
```

---

## 📊 What You Get

### Automatic Correlation
- Frontend errors → Backend queries automatically linked
- User actions → Complete request flow visible
- Performance issues → Identified across stack

### Intelligent Insights
- AI identifies patterns in failures
- Suggests likely root causes
- Groups similar errors

### Full-Stack Visibility
- **Frontend**: React components, user interactions
- **Backend**: Supabase queries, RLS policies
- **Database**: PostgreSQL query performance
- **Real-time**: WebSocket connections, subscriptions

---

## 🔍 Debugging Workflow

### For Agents

1. **User reports bug**: "Messages not appearing"
2. **Check Datadog RUM**: See user session replay
3. **Find error**: Frontend error "Cannot read property"
4. **Follow trace**: Automatically linked to Supabase query
5. **See root cause**: RLS policy blocking query
6. **Fix**: Update RLS policy
7. **Verify**: Check Datadog for successful queries

### For Developers

1. **Open Datadog**: https://app.datadoghq.com/rum/explorer
2. **Filter by error**: See all errors in last hour
3. **Click error**: See complete trace
4. **Follow flow**: Frontend → Backend → Database
5. **Identify bottleneck**: Slow query or RLS issue
6. **Fix**: Update code or database
7. **Monitor**: Watch error rate decrease

---

## 🎯 Key Features

### Distributed Tracing
See complete request flow:
```
User Click → React Component → Supabase Query → PostgreSQL → Response → UI Update
```

### Error Correlation
Frontend errors automatically linked to backend queries:
```
Frontend Error: "Cannot read property 'id'"
  ↓ (automatically linked)
Backend Query: "SELECT * FROM prayers WHERE id = null"
  ↓ (automatically linked)
Database: Query returned 0 rows
```

### Performance Monitoring
Identify slow operations:
- Slow queries (>1s) automatically flagged
- Component render times tracked
- Network requests monitored

### Real-Time Monitoring
Track WebSocket connections:
- Subscription health
- Message delivery
- Connection errors

---

## 📚 Next Steps

1. **Read**: [FULL_STACK_DEBUGGING_RESEARCH.md](./FULL_STACK_DEBUGGING_RESEARCH.md) for complete research
2. **Implement**: Use `tracedSupabase` instead of `supabase`
3. **Monitor**: Check Datadog dashboard regularly
4. **Debug**: Use traces to find root causes

---

## 🔗 Resources

- **Datadog RUM Docs**: https://docs.datadoghq.com/real_user_monitoring/
- **Datadog APM Docs**: https://docs.datadoghq.com/tracing/
- **Supabase Integration**: See `src/lib/supabase-traced.ts`

---

**Status**: ✅ Ready to implement
**Priority**: CRITICAL - Enables full-stack debugging for agents

