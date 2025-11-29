# AI Moderation System Setup Guide

## Overview

PrayerMap uses **Hive Moderation** for automated content moderation of:
- Text (prayers, responses, chat)
- Audio (voice prayers)
- Video (video responses)

Hive provides:
- <200ms latency for real-time moderation
- 99.6% precision at 90% recall
- SOC 2 Type II, ISO 27001, GDPR compliance
- No human moderators required

## Quick Start

### 1. Get Hive API Key

1. Sign up at [https://thehive.ai](https://thehive.ai)
2. Create a new project
3. Generate API key from dashboard
4. Note: Free tier available for development

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Hive Moderation API
VITE_HIVE_API_KEY=your-hive-api-key-here

# Webhook URL (for video moderation callbacks)
VITE_MODERATION_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/moderation-webhook
```

Add to Supabase Edge Functions secrets:

```bash
supabase secrets set HIVE_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Run Database Migrations

```bash
# Apply moderation tables
supabase db push

# Or run migration manually
psql -f supabase/migrations/20250129_add_moderation_tables.sql
```

### 4. Deploy Webhook Function

```bash
supabase functions deploy moderation-webhook
```

### 5. Test the Integration

```typescript
import { moderationService } from '@/services/moderation';

// Test text moderation
const result = await moderationService.moderate({
  type: 'text',
  data: {
    text: 'Please pray for my family',
    contentId: 'test-123',
    contentType: 'prayer'
  }
});

console.log(result.approved); // true
```

## Configuration

### Moderation Thresholds

Default thresholds (configurable in database):

| Category | Threshold | Description |
|----------|-----------|-------------|
| hate_speech | 0.5 | Hateful content targeting groups |
| harassment | 0.5 | Personal attacks or bullying |
| violence | 0.6 | Violent content or threats |
| self_harm | 0.4 | Self-harm references (lower = stricter) |
| sexual_content | 0.5 | Adult/sexual content |
| spam | 0.7 | Spam or promotional content |
| profanity | 0.6 | Profane language |
| illegal_activity | 0.5 | References to illegal activities |

### Adjusting Thresholds

```typescript
import { moderationService } from '@/services/moderation';

// Make hate speech detection stricter
await moderationService.updateConfig({
  thresholds: {
    hate_speech: 0.3, // Lower = stricter
    // ... other thresholds
  }
});
```

## Content Flow

### Text Moderation (Sync)

```
User submits prayer
    ↓
useModeratedSubmit hook
    ↓
moderationService.moderate({ type: 'text' })
    ↓
Hive API (< 200ms)
    ↓
├── Approved → Save to database → Publish
└── Rejected → Show friendly message → Don't save
```

### Video Moderation (Async)

```
User uploads video
    ↓
Video saved with status: 'pending_moderation'
    ↓
moderationService.moderate({ type: 'video' })
    ↓
Hive processes video (10-60 seconds)
    ↓
Webhook receives result
    ↓
├── Approved → Update status → Make visible
└── Rejected → Update status → Notify user
```

## Admin Dashboard

Access moderation logs at `/admin/moderation`:

- View all moderation decisions
- Filter by status, content type, date
- See rejection reasons
- View moderation statistics

## Error Handling

### Fail-Open vs Fail-Closed

Currently configured as **fail-open**:
- If Hive API is unavailable, content is approved
- Prevents blocking users during outages
- Trade-off: Some content may slip through during outages

To enable **fail-closed** (stricter):

```typescript
// In moderationService.ts
// Change error handling to reject on API errors
```

### Monitoring

Watch for:
- High rejection rates (> 5% may indicate issues)
- API latency spikes
- Webhook failures

## Cost Estimation

Hive pricing (approximate):
- Text: $0.001 per request
- Audio: $0.01 per minute
- Video: $0.02 per minute

At 1,000 prayers/day:
- ~$30/month for text moderation
- Additional for audio/video based on usage

## Compliance

Hive Moderation provides:
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 certified
- ✅ GDPR compliant
- ✅ HIPAA compliant (with BAA)
- ✅ No human review of content

## Troubleshooting

### Content Always Rejected

1. Check Hive API key is valid
2. Verify thresholds aren't too strict
3. Check moderation_logs for actual scores

### Video Moderation Stuck on Pending

1. Verify webhook URL is correct
2. Check Supabase function logs
3. Ensure function is deployed

### High Latency

1. Check Hive status page
2. Verify network connectivity
3. Consider caching for repeated content

## Support

- Hive Documentation: https://docs.thehive.ai
- Hive Support: support@thehive.ai
- PrayerMap Issues: GitHub Issues
