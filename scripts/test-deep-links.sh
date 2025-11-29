#!/bin/bash

# Script to test Android deep links using ADB
# Requires an Android device connected via USB or emulator running

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PACKAGE_NAME="net.prayermap.app"

echo "=================================================="
echo "PrayerMap Android Deep Links Test Suite"
echo "=================================================="
echo ""

# Check if ADB is available
if ! command -v adb &> /dev/null; then
    echo -e "${RED}Error: adb not found. Please install Android SDK Platform Tools.${NC}"
    exit 1
fi

# Check if device is connected
echo -e "${YELLOW}Checking for connected devices...${NC}"
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo -e "${RED}No Android devices connected. Please connect a device or start an emulator.${NC}"
    exit 1
fi

echo -e "${GREEN}Found $DEVICES device(s)${NC}"
echo ""

# Function to test a deep link
test_deep_link() {
    local url=$1
    local description=$2

    echo -e "${BLUE}Testing: $description${NC}"
    echo -e "${YELLOW}URL: $url${NC}"

    adb shell am start -W -a android.intent.action.VIEW -d "$url" "$PACKAGE_NAME" 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully launched app${NC}"
    else
        echo -e "${RED}✗ Failed to launch app${NC}"
    fi

    echo ""
    sleep 2
}

# Function to check app link verification status
check_verification_status() {
    echo -e "${BLUE}Checking App Link verification status...${NC}"
    echo ""

    adb shell pm get-app-links "$PACKAGE_NAME" 2>&1

    echo ""
}

# Main test suite
echo "=================================================="
echo "Test 1: App Link Verification Status"
echo "=================================================="
echo ""
check_verification_status

echo "=================================================="
echo "Test 2: HTTPS App Links (Verified)"
echo "=================================================="
echo ""

test_deep_link "https://prayermap.net/prayer/123" "Prayer detail page (HTTPS)"
test_deep_link "https://prayermap.net/user/456" "User profile page (HTTPS)"

echo "=================================================="
echo "Test 3: HTTP App Links (Fallback)"
echo "=================================================="
echo ""

test_deep_link "http://prayermap.net/prayer/789" "Prayer detail page (HTTP)"
test_deep_link "http://prayermap.net/user/101" "User profile page (HTTP)"

echo "=================================================="
echo "Test 4: Custom URL Schemes"
echo "=================================================="
echo ""

test_deep_link "prayermap://prayer/999" "Prayer detail (custom scheme)"
test_deep_link "prayermap://user/888" "User profile (custom scheme)"

echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo ""
echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo "Expected behavior:"
echo "  - HTTPS links should open app directly (if verified)"
echo "  - Custom schemes should always open app"
echo "  - If not verified, user will see app chooser dialog"
echo ""
echo "To reverify App Links:"
echo "  adb shell pm verify-app-links --re-verify $PACKAGE_NAME"
echo ""
echo "To check logs:"
echo "  adb logcat | grep DeepLink"
echo ""
