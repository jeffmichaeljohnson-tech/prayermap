#!/bin/bash

# ============================================================================
# Test Script for Send Notification Edge Function
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_URL="${SUPABASE_URL:-http://localhost:54321}/functions/v1/send-notification"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${GREEN}=== $1 ===${NC}\n"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# ============================================================================
# Test Cases
# ============================================================================

test_support_received() {
    print_header "Test 1: SUPPORT_RECEIVED Notification"

    local USER_ID="${1:-00000000-0000-0000-0000-000000000000}"

    echo "Sending SUPPORT_RECEIVED notification to user: $USER_ID"

    RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
        --header "Authorization: Bearer $SERVICE_KEY" \
        --header 'Content-Type: application/json' \
        --data "{
            \"notification_id\": 1,
            \"user_id\": \"$USER_ID\",
            \"type\": \"SUPPORT_RECEIVED\",
            \"payload\": {
                \"prayer_id\": 123,
                \"supporter_name\": \"Marcus\"
            }
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY"

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "SUPPORT_RECEIVED test passed"
    else
        print_error "SUPPORT_RECEIVED test failed"
        return 1
    fi
}

test_response_received() {
    print_header "Test 2: RESPONSE_RECEIVED Notification"

    local USER_ID="${1:-00000000-0000-0000-0000-000000000000}"

    echo "Sending RESPONSE_RECEIVED notification to user: $USER_ID"

    RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
        --header "Authorization: Bearer $SERVICE_KEY" \
        --header 'Content-Type: application/json' \
        --data "{
            \"notification_id\": 2,
            \"user_id\": \"$USER_ID\",
            \"type\": \"RESPONSE_RECEIVED\",
            \"payload\": {
                \"prayer_id\": 123,
                \"response_id\": 456,
                \"responder_name\": \"Sarah\",
                \"response_preview\": \"I'm praying for you! God is with you.\"
            }
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY"

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "RESPONSE_RECEIVED test passed"
    else
        print_error "RESPONSE_RECEIVED test failed"
        return 1
    fi
}

test_prayer_answered() {
    print_header "Test 3: PRAYER_ANSWERED Notification"

    local USER_ID="${1:-00000000-0000-0000-0000-000000000000}"

    echo "Sending PRAYER_ANSWERED notification to user: $USER_ID"

    RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
        --header "Authorization: Bearer $SERVICE_KEY" \
        --header 'Content-Type: application/json' \
        --data "{
            \"notification_id\": 3,
            \"user_id\": \"$USER_ID\",
            \"type\": \"PRAYER_ANSWERED\",
            \"payload\": {
                \"prayer_id\": 123,
                \"message\": \"Your prayer has been answered!\"
            }
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY"

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "PRAYER_ANSWERED test passed"
    else
        print_error "PRAYER_ANSWERED test failed"
        return 1
    fi
}

test_invalid_request() {
    print_header "Test 4: Invalid Request (Missing Fields)"

    echo "Sending invalid request (missing user_id)"

    RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
        --header "Authorization: Bearer $SERVICE_KEY" \
        --header 'Content-Type: application/json' \
        --data '{
            "notification_id": 4,
            "type": "SUPPORT_RECEIVED"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY"

    if [ "$HTTP_CODE" -eq 400 ]; then
        print_success "Invalid request test passed (correctly rejected)"
    else
        print_error "Invalid request test failed (should return 400)"
        return 1
    fi
}

test_no_tokens() {
    print_header "Test 5: User with No Push Tokens"

    # Use a random UUID that likely has no tokens
    local USER_ID="99999999-9999-9999-9999-999999999999"

    echo "Testing user with no push tokens: $USER_ID"

    RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
        --header "Authorization: Bearer $SERVICE_KEY" \
        --header 'Content-Type: application/json' \
        --data "{
            \"notification_id\": 5,
            \"user_id\": \"$USER_ID\",
            \"type\": \"SUPPORT_RECEIVED\",
            \"payload\": {
                \"prayer_id\": 123,
                \"supporter_name\": \"Test User\"
            }
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $BODY"

    # Should return 200 with sent: 0
    if [ "$HTTP_CODE" -eq 200 ]; then
        print_success "No tokens test passed"
    else
        print_error "No tokens test failed"
        return 1
    fi
}

# ============================================================================
# Main Test Runner
# ============================================================================

main() {
    print_header "Push Notification Edge Function Tests"

    # Check environment variables
    if [ -z "$SERVICE_KEY" ]; then
        print_error "SUPABASE_SERVICE_ROLE_KEY environment variable not set"
        echo "Usage: SUPABASE_SERVICE_ROLE_KEY=your-key ./test.sh [user_id]"
        exit 1
    fi

    echo "Function URL: $FUNCTION_URL"
    echo "Using service role key: ${SERVICE_KEY:0:10}..."

    # Get test user ID from argument or use default
    TEST_USER_ID="${1:-}"

    if [ -z "$TEST_USER_ID" ]; then
        print_warning "No user_id provided. Using default test UUID."
        print_warning "To test with real push notifications, provide a valid user_id:"
        print_warning "  ./test.sh your-user-uuid"
        TEST_USER_ID="00000000-0000-0000-0000-000000000000"
    fi

    # Run all tests
    FAILED=0

    test_support_received "$TEST_USER_ID" || FAILED=$((FAILED + 1))
    test_response_received "$TEST_USER_ID" || FAILED=$((FAILED + 1))
    test_prayer_answered "$TEST_USER_ID" || FAILED=$((FAILED + 1))
    test_invalid_request || FAILED=$((FAILED + 1))
    test_no_tokens || FAILED=$((FAILED + 1))

    # Summary
    print_header "Test Summary"
    if [ $FAILED -eq 0 ]; then
        print_success "All tests passed! ✓"
        exit 0
    else
        print_error "$FAILED test(s) failed ✗"
        exit 1
    fi
}

# Run main function
main "$@"
