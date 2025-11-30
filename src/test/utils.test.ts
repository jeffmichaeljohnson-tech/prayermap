/**
 * Simple tests for utility functions
 * Run manually to verify functionality
 */

import { formatRelativeTime, formatInboxMessage, truncateText, formatUserName, isRecentMessage } from '../lib/utils';

// Test formatRelativeTime
export function testFormatRelativeTime() {
  const now = new Date();
  const tests = [
    { input: new Date(now.getTime() - 30 * 1000), expected: 'just now' }, // 30 seconds ago
    { input: new Date(now.getTime() - 5 * 60 * 1000), expected: '5m ago' }, // 5 minutes ago
    { input: new Date(now.getTime() - 2 * 60 * 60 * 1000), expected: '2h ago' }, // 2 hours ago
    { input: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), expected: '3d ago' }, // 3 days ago
  ];
  
  console.log('Testing formatRelativeTime:');
  tests.forEach(({ input, expected }, index) => {
    const result = formatRelativeTime(input);
    console.log(`Test ${index + 1}: ${result === expected ? '✅' : '❌'} - Expected "${expected}", got "${result}"`);
  });
}

// Test formatInboxMessage
export function testFormatInboxMessage() {
  console.log('\nTesting formatInboxMessage:');
  
  const result1 = formatInboxMessage('John Doe', false, 'Please pray for my healing', 'I prayed for you today');
  console.log('Test 1 - Regular user:', {
    senderDisplay: result1.senderDisplay,
    prayerContext: result1.prayerContext,
    messagePreview: result1.messagePreview,
    isTruncated: result1.isTruncated
  });
  
  const result2 = formatInboxMessage(null, true, 'Job interview tomorrow', 'May God grant you peace and confidence. I will be praying that the interview goes well and that you find favor with the interviewer.');
  console.log('Test 2 - Anonymous user with long message:', {
    senderDisplay: result2.senderDisplay,
    prayerContext: result2.prayerContext,
    messagePreview: result2.messagePreview,
    isTruncated: result2.isTruncated
  });
}

// Test truncateText
export function testTruncateText() {
  console.log('\nTesting truncateText:');
  console.log('Short text:', truncateText('Hello', 10));
  console.log('Long text:', truncateText('This is a very long text that should be truncated', 20));
}

// Test formatUserName
export function testFormatUserName() {
  console.log('\nTesting formatUserName:');
  console.log('Regular user:', formatUserName('Jane Smith', false));
  console.log('Anonymous user:', formatUserName('Jane Smith', true));
  console.log('Null name:', formatUserName(null, false));
}

// Test isRecentMessage
export function testIsRecentMessage() {
  console.log('\nTesting isRecentMessage:');
  const now = new Date();
  console.log('30 minutes ago:', isRecentMessage(new Date(now.getTime() - 30 * 60 * 1000)));
  console.log('2 hours ago:', isRecentMessage(new Date(now.getTime() - 2 * 60 * 60 * 1000)));
}

// Run all tests
export function runAllUtilityTests() {
  console.log('=== Running Utility Function Tests ===');
  testFormatRelativeTime();
  testFormatInboxMessage();
  testTruncateText();
  testFormatUserName();
  testIsRecentMessage();
  console.log('=== Tests Complete ===');
}

// For manual testing in browser console:
// import { runAllUtilityTests } from './src/test/utils.test.ts';
// runAllUtilityTests();