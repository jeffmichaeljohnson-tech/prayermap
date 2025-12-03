#!/bin/bash
# ============================================================================
# 🔑 SEATBELT Module: API Key Health Validation
# ============================================================================
# Validates API keys are alive, not expired, and have proper permissions.
# Uses lightweight API calls to verify without side effects.
# ============================================================================

# Load environment variables from .env.local
load_env() {
    local env_file="$PROJECT_ROOT/.env.local"
    if [[ -f "$env_file" ]]; then
        # Export variables, handling quotes properly
        set -a
        source <(grep -v '^#' "$env_file" | grep -v '^$' | sed 's/\r$//')
        set +a
    fi
}

check_keys() {
    load_env

    log_info "Validating API keys with lightweight health checks..."

    # ========================================================================
    # Supabase - Check anon key by fetching public schema info
    # ========================================================================
    if [[ -n "$VITE_SUPABASE_URL" && -n "$VITE_SUPABASE_ANON_KEY" ]]; then
        local supabase_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "apikey: $VITE_SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
            "$VITE_SUPABASE_URL/rest/v1/" \
            --max-time 5 2>/dev/null)

        case $supabase_response in
            200)
                log_pass "Supabase Anon Key" "Valid and active"
                ;;
            401)
                log_fail "Supabase Anon Key" "Invalid or expired (401 Unauthorized)"
                ;;
            403)
                log_warn "Supabase Anon Key" "Valid but restricted (403 Forbidden)"
                ;;
            000)
                log_warn "Supabase Anon Key" "Could not connect to Supabase"
                ;;
            *)
                log_warn "Supabase Anon Key" "Unexpected response: $supabase_response"
                ;;
        esac
    else
        log_warn "Supabase Anon Key" "Not configured in .env.local"
    fi

    # ========================================================================
    # Mapbox - Validate token with a minimal geocoding request
    # ========================================================================
    if [[ -n "$VITE_MAPBOX_TOKEN" ]]; then
        local mapbox_response=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=$VITE_MAPBOX_TOKEN&limit=1" \
            --max-time 5 2>/dev/null)

        case $mapbox_response in
            200)
                log_pass "Mapbox Token" "Valid and active"
                ;;
            401)
                log_fail "Mapbox Token" "Invalid token (401)"
                ;;
            403)
                log_fail "Mapbox Token" "Token forbidden - check domain restrictions (403)"
                ;;
            000)
                log_warn "Mapbox Token" "Could not connect to Mapbox"
                ;;
            *)
                log_warn "Mapbox Token" "Unexpected response: $mapbox_response"
                ;;
        esac
    else
        log_warn "Mapbox Token" "Not configured"
    fi

    # ========================================================================
    # OpenAI - Check with models endpoint (minimal usage)
    # ========================================================================
    if [[ -n "$OPENAI_API_KEY" ]]; then
        local openai_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $OPENAI_API_KEY" \
            "https://api.openai.com/v1/models" \
            --max-time 5 2>/dev/null)

        case $openai_response in
            200)
                log_pass "OpenAI API Key" "Valid and active"
                ;;
            401)
                log_fail "OpenAI API Key" "Invalid or expired (401)"
                ;;
            429)
                log_warn "OpenAI API Key" "Rate limited but valid (429)"
                ;;
            000)
                log_warn "OpenAI API Key" "Could not connect to OpenAI"
                ;;
            *)
                log_warn "OpenAI API Key" "Unexpected response: $openai_response"
                ;;
        esac
    else
        log_info "OpenAI API Key not configured (optional)"
    fi

    # ========================================================================
    # Anthropic - Check with a minimal request
    # ========================================================================
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
        # Use the models endpoint which is lightweight
        local anthropic_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "x-api-key: $ANTHROPIC_API_KEY" \
            -H "anthropic-version: 2023-06-01" \
            "https://api.anthropic.com/v1/models" \
            --max-time 5 2>/dev/null)

        case $anthropic_response in
            200)
                log_pass "Anthropic API Key" "Valid and active"
                ;;
            401)
                log_fail "Anthropic API Key" "Invalid or expired (401)"
                ;;
            403)
                log_fail "Anthropic API Key" "Forbidden - check permissions (403)"
                ;;
            000)
                log_warn "Anthropic API Key" "Could not connect to Anthropic"
                ;;
            *)
                log_warn "Anthropic API Key" "Unexpected response: $anthropic_response"
                ;;
        esac
    else
        log_info "Anthropic API Key not configured (optional)"
    fi

    # ========================================================================
    # Pinecone - Check with describe index stats (read-only)
    # ========================================================================
    if [[ -n "$PINECONE_API_KEY" ]]; then
        # List indexes to verify API key
        local pinecone_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Api-Key: $PINECONE_API_KEY" \
            "https://api.pinecone.io/indexes" \
            --max-time 5 2>/dev/null)

        case $pinecone_response in
            200)
                log_pass "Pinecone API Key" "Valid and active"
                ;;
            401)
                log_fail "Pinecone API Key" "Invalid or expired (401)"
                ;;
            403)
                log_fail "Pinecone API Key" "Forbidden (403)"
                ;;
            000)
                log_warn "Pinecone API Key" "Could not connect to Pinecone"
                ;;
            *)
                log_warn "Pinecone API Key" "Unexpected response: $pinecone_response"
                ;;
        esac
    else
        log_info "Pinecone API Key not configured (optional)"
    fi

    # ========================================================================
    # Slack Bot Token - Verify with auth.test endpoint
    # ========================================================================
    if [[ -n "$SLACK_BOT_TOKEN" ]]; then
        local slack_response=$(curl -s \
            -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
            "https://slack.com/api/auth.test" \
            --max-time 5 2>/dev/null)

        if echo "$slack_response" | grep -q '"ok":true'; then
            local slack_team=$(echo "$slack_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('team','unknown'))" 2>/dev/null)
            log_pass "Slack Bot Token" "Valid - Team: $slack_team"
        elif echo "$slack_response" | grep -q '"ok":false'; then
            local slack_error=$(echo "$slack_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown'))" 2>/dev/null)
            log_fail "Slack Bot Token" "Invalid - Error: $slack_error"
        else
            log_warn "Slack Bot Token" "Could not verify"
        fi
    else
        log_info "Slack Bot Token not configured (optional)"
    fi

    # ========================================================================
    # LangSmith - Verify with a simple API call
    # ========================================================================
    if [[ -n "$LANGSMITH_API_KEY" ]]; then
        local langsmith_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "x-api-key: $LANGSMITH_API_KEY" \
            "https://api.smith.langchain.com/api/v1/info" \
            --max-time 5 2>/dev/null)

        case $langsmith_response in
            200)
                log_pass "LangSmith API Key" "Valid and active"
                ;;
            401|403)
                log_fail "LangSmith API Key" "Invalid or expired ($langsmith_response)"
                ;;
            000)
                log_warn "LangSmith API Key" "Could not connect to LangSmith"
                ;;
            *)
                log_warn "LangSmith API Key" "Unexpected response: $langsmith_response"
                ;;
        esac
    else
        log_info "LangSmith API Key not configured (optional)"
    fi

    # ========================================================================
    # Brave Search - Verify with a minimal search
    # ========================================================================
    if [[ -n "$BRAVE_API_KEY" ]]; then
        local brave_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "X-Subscription-Token: $BRAVE_API_KEY" \
            "https://api.search.brave.com/res/v1/web/search?q=test&count=1" \
            --max-time 5 2>/dev/null)

        case $brave_response in
            200)
                log_pass "Brave Search API" "Valid and active"
                ;;
            401)
                log_fail "Brave Search API" "Invalid key (401)"
                ;;
            429)
                log_warn "Brave Search API" "Rate limited but valid (429)"
                ;;
            000)
                log_warn "Brave Search API" "Could not connect"
                ;;
            *)
                log_warn "Brave Search API" "Unexpected response: $brave_response"
                ;;
        esac
    else
        log_info "Brave Search API not configured (optional)"
    fi

    # ========================================================================
    # Hive AI (Moderation) - Check API health
    # ========================================================================
    # Note: Using the non-VITE version as it should be server-side only
    local hive_key="${HIVE_API_KEY:-$VITE_HIVE_API_KEY}"
    if [[ -n "$hive_key" ]]; then
        # Hive doesn't have a simple health endpoint, so we check if the key format is valid
        if [[ "$hive_key" =~ ^[A-Za-z0-9]{20,}$ ]]; then
            log_pass "Hive AI API Key" "Format valid (cannot verify without API call)"
        else
            log_warn "Hive AI API Key" "Unusual format - verify manually"
        fi

        # Flag if using VITE_ prefix
        if [[ -n "$VITE_HIVE_API_KEY" ]]; then
            log_fail "Hive AI Security" "Using VITE_HIVE_API_KEY exposes key to client! Use HIVE_API_KEY instead"
        fi
    else
        log_info "Hive AI API Key not configured (optional)"
    fi

    # ========================================================================
    # Datadog - Verify with validate endpoint
    # ========================================================================
    if [[ -n "$DATADOG_API_KEY" ]]; then
        local datadog_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "DD-API-KEY: $DATADOG_API_KEY" \
            "https://api.datadoghq.com/api/v1/validate" \
            --max-time 5 2>/dev/null)

        case $datadog_response in
            200)
                log_pass "Datadog API Key" "Valid and active"
                ;;
            403)
                log_fail "Datadog API Key" "Invalid or expired (403)"
                ;;
            000)
                log_warn "Datadog API Key" "Could not connect to Datadog"
                ;;
            *)
                log_warn "Datadog API Key" "Unexpected response: $datadog_response"
                ;;
        esac
    else
        log_info "Datadog API Key not configured (optional)"
    fi

    # ========================================================================
    # AWS - Already checked in check_auth.sh via CLI
    # ========================================================================
    if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        log_pass "AWS Credentials" "Configured in environment (auth checked separately)"
    else
        log_info "AWS credentials not in .env.local (may use ~/.aws/credentials)"
    fi

    # ========================================================================
    # GitHub Token - Verify with user endpoint
    # ========================================================================
    if [[ -n "$GITHUB_TOKEN" ]]; then
        local github_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/user" \
            --max-time 5 2>/dev/null)

        case $github_response in
            200)
                log_pass "GitHub Token" "Valid and active"
                ;;
            401)
                log_fail "GitHub Token" "Invalid or expired (401)"
                ;;
            403)
                log_warn "GitHub Token" "Rate limited or scope issue (403)"
                ;;
            000)
                log_warn "GitHub Token" "Could not connect to GitHub"
                ;;
            *)
                log_warn "GitHub Token" "Unexpected response: $github_response"
                ;;
        esac
    else
        log_info "GitHub Token not in .env.local (using gh CLI auth instead)"
    fi

    # ========================================================================
    # Figma - Verify with me endpoint
    # ========================================================================
    if [[ -n "$FIGMA_API_KEY" ]]; then
        local figma_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "X-Figma-Token: $FIGMA_API_KEY" \
            "https://api.figma.com/v1/me" \
            --max-time 5 2>/dev/null)

        case $figma_response in
            200)
                log_pass "Figma API Key" "Valid and active"
                ;;
            403)
                log_fail "Figma API Key" "Invalid or expired (403)"
                ;;
            000)
                log_warn "Figma API Key" "Could not connect to Figma"
                ;;
            *)
                log_warn "Figma API Key" "Unexpected response: $figma_response"
                ;;
        esac
    else
        log_info "Figma API Key not in .env.local (configured in MCP servers)"
    fi
}
