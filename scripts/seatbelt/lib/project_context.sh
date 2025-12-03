#!/bin/bash
# ============================================================================
# SEATBELT Library: Project Context
# ============================================================================
# PrayerMap-specific awareness and critical path definitions.
# Compatible with bash 3.2+ (macOS default)
# ============================================================================

# Project identity
PROJECT_NAME="PrayerMap"
PROJECT_TYPE="web-app"

# Critical services (space-separated for bash 3.2 compat)
CRITICAL_SERVICES="supabase github mapbox"
IMPORTANT_SERVICES="vercel figma slack"
OPTIONAL_SERVICES="pinecone langsmith brave-search openai anthropic"

# Required environment variables
REQUIRED_ENV_VARS="VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_MAPBOX_TOKEN"

# Config file locations
CONFIG_FILE_claude_desktop="/Users/computer/Library/Application Support/Claude/claude_desktop_config.json"
CONFIG_FILE_cursor="/Users/computer/.cursor/mcp.json"
CONFIG_FILE_claude_code="$PROJECT_ROOT/.mcp.json"
CONFIG_FILE_env_local="$PROJECT_ROOT/.env.local"
CONFIG_FILE_package_json="$PROJECT_ROOT/package.json"
CONFIG_FILE_tsconfig="$PROJECT_ROOT/tsconfig.json"
CONFIG_FILE_gitconfig="/Users/computer/.gitconfig"

# Check if a service is critical
is_critical_service() {
    local service=$1
    [[ " $CRITICAL_SERVICES " =~ " $service " ]]
}

# Check if a service is important
is_important_service() {
    local service=$1
    [[ " $IMPORTANT_SERVICES " =~ " $service " ]]
}

# Get service tier
get_service_tier() {
    local service=$1
    if is_critical_service "$service"; then
        echo "critical"
    elif is_important_service "$service"; then
        echo "important"
    else
        echo "optional"
    fi
}
