#!/bin/bash
# ============================================================================
# 🔐 SEATBELT Module: Environment Variable Checks
# ============================================================================
# Validates environment variables for completeness and security.
# ============================================================================

check_env() {
    local env_local="$PROJECT_ROOT/.env.local"
    local env_example="$PROJECT_ROOT/.env.example"

    # Check .env.local exists
    if [[ ! -f "$env_local" ]]; then
        log_fail "Env Local" ".env.local not found"
        return
    fi

    log_pass "Env Local" "Found at $env_local"

    # Check .env.local is in .gitignore (also check for *.local pattern)
    if [[ -f "$PROJECT_ROOT/.gitignore" ]]; then
        if grep -qE "\.env\.local|\*\.local" "$PROJECT_ROOT/.gitignore"; then
            log_pass "Env Security" ".env.local is in .gitignore"
        else
            log_fail "Env Security" ".env.local NOT in .gitignore - SECRETS AT RISK"
        fi
    fi

    # Required VITE_ variables (client-side)
    local required_vite=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
        "VITE_MAPBOX_TOKEN"
    )

    for var in "${required_vite[@]}"; do
        if grep -q "^${var}=" "$env_local"; then
            log_pass "$var" "Defined"
        else
            log_fail "$var" "Missing - required for app to function"
        fi
    done

    # Check for dangerous VITE_ prefixes on server-side keys
    local dangerous_vite_patterns=(
        "VITE_.*SERVICE_ROLE"
        "VITE_.*SECRET"
        "VITE_HIVE_API_KEY"
        "VITE_OPENAI"
        "VITE_ANTHROPIC"
        "VITE_AWS_SECRET"
    )

    for pattern in "${dangerous_vite_patterns[@]}"; do
        if grep -qE "^${pattern}" "$env_local"; then
            local found=$(grep -E "^${pattern}" "$env_local" | cut -d= -f1)
            log_fail "Security Risk" "$found has VITE_ prefix but contains secrets"
        fi
    done

    # Check for duplicate definitions
    local duplicates=$(grep -E "^[A-Z_]+=" "$env_local" | cut -d= -f1 | sort | uniq -d)
    if [[ -n "$duplicates" ]]; then
        log_warn "Duplicates" "Found duplicate definitions: $duplicates"
    else
        log_pass "Duplicates" "No duplicate variable definitions"
    fi

    # Check .env.example exists and is up to date
    if [[ -f "$env_example" ]]; then
        log_pass "Env Example" "Found"

        # Check for variables in .env.local but not in .env.example
        local local_vars=$(grep -E "^[A-Z_]+=" "$env_local" | cut -d= -f1 | sort)
        local example_vars=$(grep -E "^[A-Z_]+=" "$env_example" | cut -d= -f1 | sort)

        local missing_from_example=$(comm -23 <(echo "$local_vars") <(echo "$example_vars") | head -5)
        if [[ -n "$missing_from_example" ]]; then
            log_warn "Env Example" "Variables in .env.local but not .env.example: $(echo $missing_from_example | tr '\n' ', ')"
        fi
    else
        log_warn "Env Example" ".env.example not found - new devs won't know what vars to set"
    fi

    # Count variables by category
    local vite_count=$(grep -c "^VITE_" "$env_local" 2>/dev/null || echo "0")
    local server_count=$(grep -E "^[A-Z_]+=" "$env_local" | grep -v "^VITE_" | wc -l)
    log_info "Variable counts: $vite_count client-side (VITE_), $server_count server-side"
}
