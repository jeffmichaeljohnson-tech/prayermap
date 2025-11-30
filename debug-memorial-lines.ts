/**
 * Debug script to check memorial lines persistence
 * 
 * This script will:
 * 1. Check if database migration 030 was applied
 * 2. Count existing memorial lines in the database
 * 3. Test the eternal memorial line functions
 * 4. Verify that lines are being fetched correctly
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMemorialLines() {
  console.log('🔍 DEBUGGING MEMORIAL LINES PERSISTENCE\n');

  try {
    // 1. Check if prayer_connections table exists and has data
    console.log('1. Checking prayer_connections table...');
    const { data: connectionsData, error: connectionsError } = await supabase
      .from('prayer_connections')
      .select('*')
      .limit(10);

    if (connectionsError) {
      console.error('❌ Error accessing prayer_connections:', connectionsError);
    } else {
      console.log(`✅ Found ${connectionsData?.length || 0} memorial lines in database`);
      if (connectionsData && connectionsData.length > 0) {
        console.log('📝 Sample connection:', {
          id: connectionsData[0].id,
          created_at: connectionsData[0].created_at,
          expires_at: connectionsData[0].expires_at,
          prayer_id: connectionsData[0].prayer_id
        });
      }
    }

    // 2. Test the get_all_connections function
    console.log('\n2. Testing get_all_connections() function...');
    const { data: allConnections, error: allConnectionsError } = await supabase
      .rpc('get_all_connections');

    if (allConnectionsError) {
      console.error('❌ Error calling get_all_connections:', allConnectionsError);
    } else {
      console.log(`✅ get_all_connections() returned ${allConnections?.length || 0} lines`);
      if (allConnections && allConnections.length > 0) {
        console.log('📝 Sample from function:', {
          id: allConnections[0].id,
          requester_name: allConnections[0].requester_name,
          replier_name: allConnections[0].replier_name,
          created_at: allConnections[0].created_at,
          expires_at: allConnections[0].expires_at
        });
      }
    }

    // 3. Check if eternal memorial test functions exist
    console.log('\n3. Testing eternal memorial verification...');
    try {
      const { data: testResults, error: testError } = await supabase
        .rpc('run_eternal_memorial_tests');

      if (testError) {
        console.log('⚠️ Eternal test functions not found (Migration 031 not applied)');
        console.log('This is OK - Migration 030 is what matters for persistence');
      } else {
        console.log('✅ Eternal memorial tests available:');
        testResults?.forEach((test: any) => {
          console.log(`  ${test.test_passed ? '✅' : '❌'} ${test.test_name}: ${test.details}`);
        });
      }
    } catch (e) {
      console.log('⚠️ Could not run eternal tests (functions may not exist yet)');
    }

    // 4. Check for expired connections that should still be visible
    console.log('\n4. Checking for expired connections...');
    const { data: expiredConnections, error: expiredError } = await supabase
      .from('prayer_connections')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .limit(5);

    if (expiredError) {
      console.error('❌ Error checking expired connections:', expiredError);
    } else {
      console.log(`✅ Found ${expiredConnections?.length || 0} expired connections`);
      if (expiredConnections && expiredConnections.length > 0) {
        console.log('📝 These should still be visible on the map (eternal principle)');
        expiredConnections.forEach(conn => {
          const daysSinceExpired = Math.floor(
            (new Date().getTime() - new Date(conn.expires_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          console.log(`  - Connection ${conn.id} expired ${daysSinceExpired} days ago`);
        });
      }
    }

    // 5. Create a test memorial line to verify creation works
    console.log('\n5. Testing memorial line creation...');
    
    // First get or create a test prayer
    const { data: existingPrayers } = await supabase
      .from('prayers')
      .select('*')
      .limit(1);

    if (existingPrayers && existingPrayers.length > 0) {
      const testPrayer = existingPrayers[0];
      
      // Test the create_prayer_connection function
      const { data: newConnection, error: connectionError } = await supabase
        .rpc('create_prayer_connection', {
          p_prayer_id: testPrayer.id,
          p_prayer_response_id: crypto.randomUUID(),
          p_responder_lat: 40.7128,
          p_responder_lng: -74.0060
        });

      if (connectionError) {
        console.error('❌ Error creating test connection:', connectionError);
      } else {
        console.log('✅ Successfully created test memorial line:', newConnection);
      }
    } else {
      console.log('⚠️ No existing prayers found to test connection creation');
    }

    console.log('\n🎯 SUMMARY:');
    console.log('- Check if memorial lines are showing up on the map');
    console.log('- If no lines visible but data exists in DB, issue is in frontend rendering');
    console.log('- If no data in DB, issue is in connection creation during prayer responses');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  debugMemorialLines();
}

export { debugMemorialLines };