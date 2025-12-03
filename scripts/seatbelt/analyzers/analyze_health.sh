#!/bin/bash
# ============================================================================
# SEATBELT Analyzer: Overall Health Score
# ============================================================================
# Aggregates all category scores into a weighted overall health score.
# Compatible with bash 3.2+ (macOS default)
# ============================================================================

HEALTH_RESULTS_overall_score=0
HEALTH_RESULTS_grade=""
HEALTH_RESULTS_descriptor=""
HEALTH_RESULTS_verdict=""
HEALTH_RESULTS_verdict_message=""

analyze_health() {
    # Calculate authentication score from check results
    calculate_auth_health

    # Calculate structure score
    calculate_structure_health

    # Calculate freshness score
    calculate_freshness_health

    # MCP and Security scores are set by their respective analyzers

    # Calculate weighted overall
    HEALTH_RESULTS_overall_score=$(calculate_overall_health)
    HEALTH_RESULTS_grade=$(score_to_grade $HEALTH_RESULTS_overall_score)
    HEALTH_RESULTS_descriptor=$(score_to_descriptor $HEALTH_RESULTS_overall_score)

    # Determine verdict
    determine_verdict
}

calculate_auth_health() {
    # Count authenticated services
    local core_auth=0
    local core_total=3  # GitHub, Supabase, Git

    local optional_auth=0
    local optional_total=2  # Vercel, AWS

    # Check GitHub
    if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
        ((core_auth++))
    fi

    # Check Supabase
    if [[ -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]]; then
        ((core_auth++))
    fi

    # Check Git remote
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        ((core_auth++))
    fi

    # Check Vercel
    if command -v vercel &> /dev/null && vercel whoami &> /dev/null 2>&1; then
        ((optional_auth++))
    fi

    # Check AWS
    if command -v aws &> /dev/null && aws sts get-caller-identity &> /dev/null 2>&1; then
        ((optional_auth++))
    fi

    CATEGORY_SCORES_authentication=$(calculate_auth_score $core_auth $core_total $optional_auth $optional_total)
}

calculate_structure_health() {
    local found=0
    local total=0

    # Check required directories
    local dirs="src src/components src/hooks src/lib docs supabase"
    for dir in $dirs; do
        ((total++))
        [[ -d "$PROJECT_ROOT/$dir" ]] && ((found++))
    done

    # Check critical docs
    local docs="docs/CLAUDE.md docs/PRD.md docs/RULES.md"
    for doc in $docs; do
        ((total++))
        [[ -f "$PROJECT_ROOT/$doc" ]] && ((found++))
    done

    # Check key config files
    ((total++))
    [[ -f "$PROJECT_ROOT/package.json" ]] && ((found++))
    ((total++))
    [[ -f "$PROJECT_ROOT/tsconfig.json" ]] && ((found++))

    if [[ $total -gt 0 ]]; then
        CATEGORY_SCORES_structure=$((found * 100 / total))
    else
        CATEGORY_SCORES_structure=100
    fi
}

calculate_freshness_health() {
    # Freshness based on config file modification times
    local fresh_count=0
    local total_count=0
    local now=$(date +%s)
    local week_ago=$((now - 7 * 24 * 60 * 60))

    local files="$PROJECT_ROOT/.env.local $PROJECT_ROOT/package.json"
    for file in $files; do
        if [[ -f "$file" ]]; then
            ((total_count++))
            local file_time=$(stat -f %m "$file" 2>/dev/null || echo 0)
            if [[ $file_time -gt $week_ago ]]; then
                ((fresh_count++))
            fi
        fi
    done

    if [[ $total_count -gt 0 ]]; then
        local raw_score=$((fresh_count * 100 / total_count))
        # Boost: configs don't need to change often
        CATEGORY_SCORES_freshness=$(( (raw_score + 100) / 2 ))
    else
        CATEGORY_SCORES_freshness=75
    fi
}

determine_verdict() {
    local score=$HEALTH_RESULTS_overall_score

    if [[ $FAIL_COUNT -gt 0 ]]; then
        HEALTH_RESULTS_verdict="blocked"
        HEALTH_RESULTS_verdict_message="$FAIL_COUNT critical issue(s) must be resolved before development."
    elif [[ $score -ge 80 ]]; then
        HEALTH_RESULTS_verdict="ready"
        HEALTH_RESULTS_verdict_message="Configuration is solid. All systems nominal."
    elif [[ $score -ge 60 ]]; then
        HEALTH_RESULTS_verdict="warning"
        HEALTH_RESULTS_verdict_message="Development can proceed. Review recommendations when convenient."
    else
        HEALTH_RESULTS_verdict="warning"
        HEALTH_RESULTS_verdict_message="Multiple issues detected. Recommend addressing before major work."
    fi
}
