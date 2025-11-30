#!/usr/bin/env tsx

/**
 * Script to manually save a chat conversation to Pinecone
 * Usage: npx tsx scripts/save-chat-to-pinecone.ts
 */

import { IntelligentPineconeUploader, ConversationDataUtils, ConversationData } from '../src/services/pineconeService';
import { Pinecone } from '@pinecone-database/pinecone';

// This conversation summary
const conversationContent = `
# Inbox Message Delivery Analysis & Architecture Comparison

## Conversation Summary

**Date**: 2024-11-30
**Topic**: Inbox message delivery issues and architecture comparison with industry leaders
**Participants**: User, Claude (Mobile Developer Expert)

## Key Findings

### 1. Root Cause Analysis
- **CRITICAL BUG IDENTIFIED**: Frontend inbox query doesn't use the notifications table
- Database has complete notifications system (Migration 020) with triggers and RLS policies
- Frontend fetchUserInbox() queries prayer_responses directly instead of notifications table
- Real-time subscriptions listen to wrong table (prayer_responses instead of notifications)

### 2. Architecture Comparison with Industry Leaders
- **Architecture is CORRECT**: prayer_responses IS the messages table (equivalent to WhatsApp's messages, Instagram's direct_messages)
- **Implementation is WRONG**: Frontend doesn't follow industry standard pattern
- Industry standard: Messages Table → Trigger → Notifications Table → Inbox Query
- PrayerMap pattern: prayer_responses → Trigger → notifications → ❌ (frontend queries wrong table)

### 3. Industry Standard Pattern
- WhatsApp: messages table → notifications table → inbox queries notifications
- Instagram DM: direct_messages table → notifications table → inbox queries notifications  
- Facebook Messenger: messages table → notifications table → inbox queries notifications
- All platforms follow: Messages INSERT → Trigger creates Notification → Inbox queries Notifications

### 4. Technical Issues
- Issue #1: Frontend queries prayer_responses instead of notifications
- Issue #2: Real-time subscription listens to prayer_responses instead of notifications
- Issue #3: Missing responder name resolution (notifications table has actor_name)
- Issue #4: Notification Integration Guide not followed

### 5. Solution Required
- Update fetchUserInbox() to use supabase.rpc('get_user_notifications')
- Update real-time subscription to listen to notifications table
- Use mark_notification_read() function instead of manual updates
- Follow the NOTIFICATION_INTEGRATION_GUIDE.md that was created but not implemented

## Code Locations

- Frontend inbox query: src/services/prayerService.ts:572-682
- Real-time subscription: src/services/inboxSyncService.ts:100-112
- Database migration: supabase/migrations/020_create_notifications_system.sql
- Integration guide: NOTIFICATION_INTEGRATION_GUIDE.md

## Key Insights

1. **Architecture is sound** - Matches industry standards perfectly
2. **Implementation mismatch** - Frontend needs to use notifications table
3. **Database ready** - All triggers, RLS policies, and RPC functions exist
4. **Simple fix** - Change frontend to query notifications instead of prayer_responses

## UI/UX Research Findings

- Current design has good foundation with glassmorphic styling
- Recommended enhancements from major platforms:
  - Conversation grouping (WhatsApp pattern)
  - Unread count badges (Instagram pattern)
  - Search functionality (Telegram pattern)
  - Pull-to-refresh (Messenger pattern)
  - Swipe actions (iOS pattern)

## Decision

- Keep custom implementation (better than templates)
- Fix backend integration to use notifications table
- Enhance UI/UX incrementally with proven patterns

## Next Steps

1. Fix fetchUserInbox() to query notifications table
2. Update real-time subscription to listen to notifications
3. Test message delivery end-to-end
4. Implement UI/UX enhancements incrementally
`;

async function saveConversationToPinecone() {
  console.log('🚀 Saving conversation to Pinecone...');

  // Check environment variables
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY environment variable not set');
  }

  // Use default index name if not set (matches mcp-memory-server default)
  const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'ora-prayermap';
  console.log(`📊 Using Pinecone index: ${indexName}`);

  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });

  // Verify index exists
  const indexes = await pinecone.listIndexes();
  const indexExists = indexes.indexes?.some(idx => idx.name === indexName);
  
  if (!indexExists) {
    console.warn(`⚠️ Index "${indexName}" not found. Available indexes:`);
    indexes.indexes?.forEach(idx => console.log(`  - ${idx.name}`));
    throw new Error(`Index "${indexName}" does not exist. Please create it first or set PINECONE_INDEX_NAME to an existing index.`);
  }

  // Initialize uploader
  const uploader = new IntelligentPineconeUploader({
    batchSize: 10,
    chunkSize: 2000,
    chunkOverlap: 200,
    enableMetadataEnrichment: true,
    retryAttempts: 3,
    retryDelay: 1000
  });

  // Inject Pinecone client into uploader
  (uploader as any).pinecone = pinecone.index(indexName);

  // Create conversation data
  const conversation: ConversationData = {
    id: `chat_${Date.now()}_inbox_analysis`,
    timestamp: new Date(),
    participants: ['User', 'Claude'],
    content: conversationContent,
    type: 'conversation',
    source: 'claude',
    metadata: {
      topic: 'inbox message delivery',
      domain: 'backend',
      technologies: ['Supabase', 'PostgreSQL', 'React', 'TypeScript'],
      importance: 'critical',
      project: 'prayermap',
      tags: [
        'inbox',
        'notifications',
        'message-delivery',
        'architecture',
        'database',
        'real-time',
        'supabase',
        'frontend-bug',
        'industry-comparison'
      ],
      decisions: [
        'Architecture is correct - matches industry standards',
        'Frontend needs to use notifications table',
        'Keep custom UI implementation',
        'Fix backend integration first'
      ],
      outcome: 'Identified root cause: frontend queries wrong table. Solution: update fetchUserInbox() to use notifications table via RPC function.',
      relatedFiles: [
        'src/services/prayerService.ts',
        'src/services/inboxSyncService.ts',
        'src/hooks/useInbox.ts',
        'supabase/migrations/020_create_notifications_system.sql',
        'NOTIFICATION_INTEGRATION_GUIDE.md'
      ]
    }
  };

  try {
    // Upload conversation
    await uploader.uploadConversations([conversation]);
    
    console.log('✅ Successfully saved conversation to Pinecone!');
    console.log(`📝 Conversation ID: ${conversation.id}`);
    console.log(`📊 Content length: ${conversation.content.length} characters`);
    console.log(`🏷️ Tags: ${conversation.metadata?.tags?.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Failed to save conversation:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  saveConversationToPinecone().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}

export { saveConversationToPinecone };

