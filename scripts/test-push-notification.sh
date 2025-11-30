#!/bin/bash

# Test Push Notification System
# Usage: ./scripts/test-push-notification.sh

set -e

echo "🔔 Testing Push Notification System"
echo "===================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "Create .env with:"
    echo "  SUPABASE_URL=https://your-project.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    exit 1
fi

# Load environment variables
source .env

# Get user input
echo "Enter user UUID to send test notification:"
read USER_ID

if [ -z "$USER_ID" ]; then
    echo "❌ User ID is required"
    exit 1
fi

echo ""
echo "Sending test notification to user: $USER_ID"
echo ""

# Send test request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/send-notification" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"notification_id\": 999,
        \"user_id\": \"$USER_ID\",
        \"type\": \"SUPPORT_RECEIVED\",
        \"payload\": {
            \"prayer_id\": 123,
            \"supporter_name\": \"Test User\",
            \"message\": \"This is a test notification\"
        }
    }")

# Split response and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

echo "Response Status: $HTTP_STATUS"
echo "Response Body:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "✅ Test completed successfully"
    
    # Parse results
    SENT=$(echo "$HTTP_BODY" | jq -r '.sent // 0' 2>/dev/null)
    FAILED=$(echo "$HTTP_BODY" | jq -r '.failed // 0' 2>/dev/null)
    
    echo "   Sent: $SENT"
    echo "   Failed: $FAILED"
    
    if [ "$SENT" = "0" ]; then
        echo ""
        echo "⚠️  No notifications sent. Possible reasons:"
        echo "   - User has no registered push tokens"
        echo "   - User needs to login on mobile app"
        echo "   - Push notifications disabled for user"
    fi
else
    echo ""
    echo "❌ Test failed with status: $HTTP_STATUS"
fi

echo ""
echo "📊 Check logs with:"
echo "   npx supabase functions logs send-notification"
