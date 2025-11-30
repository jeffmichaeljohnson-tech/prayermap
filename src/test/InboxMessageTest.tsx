/**
 * Test component to verify inbox message formatting
 */

import React from 'react';
import { formatRelativeTime, formatInboxMessage } from '../lib/utils';

interface TestMessage {
  id: string;
  responderName: string | null;
  isAnonymous: boolean;
  prayerTitle: string;
  message: string;
  timestamp: Date;
}

const testMessages: TestMessage[] = [
  {
    id: '1',
    responderName: 'Sarah Johnson',
    isAnonymous: false,
    prayerTitle: 'Please pray for my mother who is in the hospital',
    message: 'I just prayed for your mother. May God grant her swift healing and comfort your family during this difficult time.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  },
  {
    id: '2',
    responderName: null,
    isAnonymous: true,
    prayerTitle: 'Lost my job today',
    message: 'Praying for new opportunities to come your way. Trust that God has a plan for your future.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: '3',
    responderName: 'Michael Chen',
    isAnonymous: false,
    prayerTitle: 'Struggling with anxiety and depression lately',
    message: 'I understand what you\'re going through as I\'ve battled similar challenges. Praying for God\'s peace to fill your heart and mind. Remember that you are loved and not alone in this journey. There is hope and healing available. Consider reaching out to a counselor or trusted friend who can walk alongside you during this season.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: '4',
    responderName: 'Jennifer Martinez',
    isAnonymous: false,
    prayerTitle: 'Wedding planning stress',
    message: 'Congratulations on your upcoming wedding! Praying for peace over the planning process.',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  },
];

export function InboxMessageTest() {
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Inbox Message Formatting Test</h2>
      <div className="space-y-4">
        {testMessages.map((msg) => {
          const formatted = formatInboxMessage(
            msg.responderName,
            msg.isAnonymous,
            msg.prayerTitle,
            msg.message
          );
          
          return (
            <div key={msg.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-medium text-gray-800 mb-1">
                {formatted.senderDisplay}
                {msg.isAnonymous && (
                  <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                    anonymous
                  </span>
                )}
              </div>
              
              <div className="text-xs text-purple-600 mb-2">
                {formatted.prayerContext}
              </div>
              
              <div className="text-sm text-gray-700 mb-2">
                "{formatted.isTruncated ? formatted.messagePreview : formatted.fullMessage}"
                {formatted.isTruncated && (
                  <span className="text-xs text-purple-600 ml-1">
                    [truncated]
                  </span>
                )}
              </div>
              
              <div className="text-xs text-gray-500">
                {formatRelativeTime(msg.timestamp)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}