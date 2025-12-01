// Test script to validate prayer response API endpoint from the frontend
// Run this in the browser console or as a script to test the fixes

import { supabase } from './src/lib/supabase';
import { respondToPrayer, fetchAllPrayers, fetchUserInbox } from './src/services/prayerService';

async function testPrayerResponseAPI() {
  try {
    console.log('🧪 Starting Prayer Response API Test...');
    
    // 1. Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated - cannot test API');
      return;
    }
    console.log('✅ User authenticated:', user.id);
    
    // 2. Get a test prayer
    const prayers = await fetchAllPrayers(10);
    if (prayers.length === 0) {
      console.error('❌ No prayers found to test response on');
      return;
    }
    
    const testPrayer = prayers[0];
    console.log('✅ Found test prayer:', testPrayer.id, testPrayer.content.substring(0, 50) + '...');
    
    // 3. Test prayer response creation
    const testMessage = 'Test response from API validation - ' + new Date().toISOString();
    const testLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco
    
    console.log('🔄 Creating prayer response...');
    const responseResult = await respondToPrayer(
      testPrayer.id,
      user.id,
      'Test User',
      testMessage,
      'text',
      undefined, // no media URL
      false, // not anonymous
      testLocation
    );
    
    if (!responseResult) {
      console.error('❌ Failed to create prayer response');
      return;
    }
    
    console.log('✅ Prayer response created successfully:', responseResult.response.id);
    
    // 4. Wait a moment for triggers to fire
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. Check if notification was created (check inbox)
    console.log('🔄 Checking inbox for notifications...');
    const inbox = await fetchUserInbox(testPrayer.user_id, 10);
    
    // Find the prayer in the inbox
    const inboxItem = inbox.find(item => item.prayer.id === testPrayer.id);
    if (inboxItem && inboxItem.responses.length > 0) {
      const latestResponse = inboxItem.responses.find(r => r.message === testMessage);
      if (latestResponse) {
        console.log('✅ Response appears in inbox successfully!');
        console.log('   Response ID:', latestResponse.id);
        console.log('   Unread count:', inboxItem.unreadCount);
      } else {
        console.error('❌ Response not found in inbox responses');
      }
    } else {
      console.error('❌ Prayer not found in inbox or no responses');
    }
    
    // 6. Cleanup - delete the test response
    if (responseResult.response.id) {
      console.log('🔄 Cleaning up test response...');
      const { error } = await supabase
        .from('prayer_responses')
        .delete()
        .eq('id', responseResult.response.id)
        .eq('responder_id', user.id);
        
      if (error) {
        console.warn('⚠️ Could not delete test response:', error);
      } else {
        console.log('✅ Test response deleted successfully');
      }
    }
    
    console.log('🎉 Prayer Response API Test completed!');
    
  } catch (error) {
    console.error('❌ Prayer Response API Test failed:', error);
    
    // Log detailed error information
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    if (error.details) {
      console.error('   Error Details:', error.details);
    }
    if (error.hint) {
      console.error('   Error Hint:', error.hint);
    }
  }
}

// Export for use
export { testPrayerResponseAPI };

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('To test the Prayer Response API, run: testPrayerResponseAPI()');
}