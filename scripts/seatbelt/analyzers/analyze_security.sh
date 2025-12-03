#!/bin/bash
# ============================================================================
# SEATBELT Analyzer: Security Posture Analysis
# ============================================================================
# Analyzes security configuration for:
# - Secret exposure risks
# - Environment variable safety
# - Gitignore coverage
# Compatible with bash 3.2+ (macOS default)
# ============================================================================

SECURITY_STATS_score=100
SECURITY_STATS_critical_issues=0
SECURITY_STATS_warnings=0
SECURITY_STATS_secrets_in_env_local=0
SECURITY_STATS_vite_prefix_violations=0
SECURITY_STATS_gitignore_coverage=0

analyze_security() {
    SECURITY_STATS_score=100

    # Check 1: .env.local exists and is protected
    check_env_protection

    # Check 2: No dangerous VITE_ prefixes
    check_vite_exposure

    # Check 3: Gitignore coverage
    check_gitignore_coverage

    # Calculate final score
    calculate_security_score

    # Set category score
    CATEGORY_SCORES_security=$SECURITY_STATS_score
}

check_env_protection() {
    local env_local="$PROJECT_ROOT/.env.local"
    local gitignore="$PROJECT_ROOT/.gitignore"

    # Check if .env.local exists
    if [[ ! -f "$env_local" ]]; then
        ((SECURITY_STATS_critical_issues++))
        return
    fi

    # Check if .env.local is in .gitignore (also check for *.local pattern)
    if [[ -f "$gitignore" ]]; then
        if grep -qE "\.env\.local|\*\.local" "$gitignore"; then
            SECURITY_STATS_gitignore_coverage=1
        else
            ((SECURITY_STATS_critical_issues++))
        fi
    else
        ((SECURITY_STATS_warnings++))
    fi

    # Count secrets in .env.local
    SECURITY_STATS_secrets_in_env_local=$(grep -cE "^[A-Z_]+=" "$env_local" 2>/dev/null || echo 0)
}

check_vite_exposure() {
    local env_local="$PROJECT_ROOT/.env.local"

    [[ ! -f "$env_local" ]] && return

    # Dangerous patterns - server-side secrets with VITE_ prefix
    local dangerous_patterns="VITE_.*SERVICE_ROLE|VITE_.*SECRET|VITE_HIVE_API_KEY|VITE_OPENAI|VITE_ANTHROPIC|VITE_AWS_SECRET|VITE_PINECONE|VITE_SLACK_BOT_TOKEN"

    local violations
    violations=$(grep -cE "^($dangerous_patterns)" "$env_local" 2>/dev/null) || violations=0
    SECURITY_STATS_vite_prefix_violations=$violations

    if [[ "$violations" -gt 0 ]]; then
        SECURITY_STATS_critical_issues=$((SECURITY_STATS_critical_issues + violations))
    fi
}

check_gitignore_coverage() {
    local gitignore="$PROJECT_ROOT/.gitignore"

    [[ ! -f "$gitignore" ]] && return

    # Files that should be ignored
    local covered=0
    local total=6

    grep -q "\.env\.local" "$gitignore" 2>/dev/null && ((covered++))
    grep -q "\.env$" "$gitignore" 2>/dev/null && ((covered++))
    grep -q "\.pem" "$gitignore" 2>/dev/null && ((covered++))
    grep -q "\.key" "$gitignore" 2>/dev/null && ((covered++))
    grep -q "credentials" "$gitignore" 2>/dev/null && ((covered++))
    grep -q "settings\.local" "$gitignore" 2>/dev/null && ((covered++))

    SECURITY_STATS_gitignore_coverage=$((covered * 100 / total))
}

calculate_security_score() {
    local score=100

    # Critical issues: -20 each
    score=$((score - SECURITY_STATS_critical_issues * 20))

    # Warnings: -5 each
    score=$((score - SECURITY_STATS_warnings * 5))

    # Floor at 0
    [[ $score -lt 0 ]] && score=0

    SECURITY_STATS_score=$score
}

generate_security_recommendations() {
    if [[ "${SECURITY_STATS_vite_prefix_violations:-0}" -gt 0 ]]; then
        add_optimization "HIGH" "Security" \
            "Remove VITE_ prefix from server-side secrets" \
            "$SECURITY_STATS_vite_prefix_violations variables expose secrets to client-side code" \
            "Rename to remove VITE_ prefix - these values will not be available in browser"
    fi

    if [[ "${SECURITY_STATS_gitignore_coverage:-0}" -lt 80 ]]; then
        add_optimization "MEDIUM" "Security" \
            "Improve .gitignore coverage" \
            "Some sensitive file patterns may not be ignored" \
            "Add missing patterns to prevent accidental secret commits"
    fi
}
