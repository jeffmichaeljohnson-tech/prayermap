#!/bin/bash

# Script to get Android SHA-256 fingerprints for Digital Asset Links
# Used for configuring Android App Links in assetlinks.json

set -e

echo "=================================================="
echo "Android SHA-256 Fingerprint Extraction Tool"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to extract SHA-256 from keytool output
extract_sha256() {
    local keystore_path=$1
    local alias=$2
    local storepass=$3
    local keypass=$4

    echo -e "${YELLOW}Checking keystore: ${keystore_path}${NC}"

    if [ ! -f "$keystore_path" ]; then
        echo -e "${RED}Keystore not found: ${keystore_path}${NC}"
        return 1
    fi

    echo -e "${GREEN}Keystore found!${NC}"
    echo ""

    # Get the SHA-256 fingerprint
    SHA256=$(keytool -list -v -keystore "$keystore_path" -alias "$alias" \
        -storepass "$storepass" -keypass "$keypass" 2>/dev/null | \
        grep "SHA256:" | sed 's/.*SHA256: //')

    if [ -z "$SHA256" ]; then
        echo -e "${RED}Failed to extract SHA-256 fingerprint${NC}"
        return 1
    fi

    echo -e "${GREEN}SHA-256 Fingerprint:${NC}"
    echo "$SHA256"
    echo ""
    echo -e "${YELLOW}Copy this fingerprint to assetlinks.json${NC}"
    echo ""

    return 0
}

echo "1. Extracting DEBUG keystore fingerprint..."
echo "============================================="
echo ""

DEBUG_KEYSTORE="$HOME/.android/debug.keystore"

if [ ! -f "$DEBUG_KEYSTORE" ]; then
    echo -e "${YELLOW}Debug keystore not found. Creating it...${NC}"
    keytool -genkey -v -keystore "$DEBUG_KEYSTORE" \
        -alias androiddebugkey -keyalg RSA -keysize 2048 \
        -validity 10000 -storepass android -keypass android \
        -dname "CN=Android Debug,O=Android,C=US"
    echo -e "${GREEN}Debug keystore created!${NC}"
    echo ""
fi

extract_sha256 "$DEBUG_KEYSTORE" "androiddebugkey" "android" "android"

echo ""
echo "2. Checking for RELEASE keystore..."
echo "===================================="
echo ""

# Common release keystore locations
RELEASE_KEYSTORES=(
    "./android/app/release.keystore"
    "./android/release.keystore"
    "./release.keystore"
    "$HOME/prayermap-release.keystore"
    "$HOME/.android/release.keystore"
)

RELEASE_FOUND=false

for keystore in "${RELEASE_KEYSTORES[@]}"; do
    if [ -f "$keystore" ]; then
        echo -e "${YELLOW}Found release keystore: ${keystore}${NC}"
        echo ""
        echo "Enter the alias name (default: prayermap):"
        read -r alias
        alias=${alias:-prayermap}

        echo "Enter the keystore password:"
        read -rs storepass
        echo ""

        echo "Enter the key password (press Enter if same as keystore password):"
        read -rs keypass
        keypass=${keypass:-$storepass}
        echo ""

        if extract_sha256 "$keystore" "$alias" "$storepass" "$keypass"; then
            RELEASE_FOUND=true
            break
        fi
    fi
done

if [ "$RELEASE_FOUND" = false ]; then
    echo -e "${YELLOW}No release keystore found in common locations.${NC}"
    echo ""
    echo "To get the release SHA-256 fingerprint:"
    echo "  1. Get it from Google Play Console:"
    echo "     Play Console > App Integrity > App Signing > SHA-256 certificate fingerprint"
    echo ""
    echo "  2. Or extract from your release keystore:"
    echo "     keytool -list -v -keystore /path/to/release.keystore -alias your-alias"
    echo ""
fi

echo ""
echo "=================================================="
echo "Next Steps:"
echo "=================================================="
echo ""
echo "1. Copy the SHA-256 fingerprints above"
echo "2. Edit public/.well-known/assetlinks.json"
echo "3. Replace REPLACE_WITH_DEBUG_SHA256_FINGERPRINT with debug SHA-256"
echo "4. Replace REPLACE_WITH_RELEASE_SHA256_FINGERPRINT with release SHA-256"
echo "5. Deploy assetlinks.json to https://prayermap.net/.well-known/"
echo "6. Verify using: https://developers.google.com/digital-asset-links/tools/generator"
echo ""
