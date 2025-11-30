/**
 * Debug script to test prayer loading and marker visibility
 * Run with: npx tsx debug-prayers.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oomrmfhvsxtxgqqthisz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXJtZmh2c3h0eGdxcXRoaXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyNDIsImV4cCI6MjA3OTA2MzI0Mn0.5MxjbSa0yaBbMcEuxxlTXu8dM3fenl0ZzDXheSMd7C8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPrayers() {
  console.log('🔍 PRAYER DEBUG: Starting investigation...\n');

  // Test 1: Check if get_all_prayers function exists and works
  console.log('TEST 1: Testing get_all_prayers function...');
  try {
    const { data: prayers, error } = await supabase.rpc('get_all_prayers', { limit_count: 5 });
    
    if (error) {
      console.error('❌ get_all_prayers failed:', error);
    } else {
      console.log(`✅ get_all_prayers works! Found ${prayers?.length || 0} prayers`);
      if (prayers && prayers.length > 0) {
        prayers.forEach((prayer: any, index: number) => {
          console.log(`   Prayer ${index + 1}:`, {
            id: prayer.id,
            content: prayer.content?.substring(0, 50) + '...',
            location: prayer.location,
            user_name: prayer.user_name,
            is_anonymous: prayer.is_anonymous,
            created_at: prayer.created_at
          });
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception calling get_all_prayers:', err);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Check direct prayers table access
  console.log('TEST 2: Testing direct prayers table access...');
  try {
    const { data: directPrayers, error: directError } = await supabase
      .from('prayers')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false });
    
    if (directError) {
      console.error('❌ Direct prayers query failed:', directError);
    } else {
      console.log(`✅ Direct prayers access works! Found ${directPrayers?.length || 0} prayers`);
      if (directPrayers && directPrayers.length > 0) {
        directPrayers.forEach((prayer: any, index: number) => {
          console.log(`   Direct Prayer ${index + 1}:`, {
            id: prayer.id,
            content: prayer.content?.substring(0, 50) + '...',
            location: prayer.location,
            user_name: prayer.user_name,
            status: prayer.status,
            created_at: prayer.created_at
          });
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception accessing prayers table:', err);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Check prayer connections
  console.log('TEST 3: Testing prayer connections...');
  try {
    const { data: connections, error: connError } = await supabase
      .from('prayer_connections')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false });
    
    if (connError) {
      console.error('❌ Prayer connections query failed:', connError);
    } else {
      console.log(`✅ Prayer connections access works! Found ${connections?.length || 0} connections`);
      if (connections && connections.length > 0) {
        connections.forEach((conn: any, index: number) => {
          console.log(`   Connection ${index + 1}:`, {
            id: conn.id,
            prayer_id: conn.prayer_id,
            from_location: conn.from_location,
            to_location: conn.to_location,
            created_at: conn.created_at
          });
        });
      }
    }
  } catch (err) {
    console.error('❌ Exception accessing prayer_connections:', err);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 4: Create a test prayer if we're authenticated
  console.log('TEST 4: Testing prayer creation (if authenticated)...');
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user) {
      console.log('✅ User authenticated:', session.session.user.email);
      
      // Create test prayer
      const testPrayer = {
        user_id: session.session.user.id,
        content: 'Test prayer for debugging - ' + new Date().toISOString(),
        content_type: 'text',
        location: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        user_name: 'Debug User',
        is_anonymous: false,
        status: 'active'
      };

      const { data: newPrayer, error: createError } = await supabase
        .from('prayers')
        .insert(testPrayer)
        .select()
        .single();

      if (createError) {
        console.error('❌ Prayer creation failed:', createError);
      } else {
        console.log('✅ Test prayer created successfully:', newPrayer.id);
      }
    } else {
      console.log('ℹ️  No authenticated user - skipping prayer creation test');
    }
  } catch (err) {
    console.error('❌ Exception in prayer creation test:', err);
  }

  console.log('\n🔍 PRAYER DEBUG: Investigation complete!\n');
}

// Run the debug
debugPrayers().catch(console.error);