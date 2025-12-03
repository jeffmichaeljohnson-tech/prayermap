#!/bin/bash
# ============================================================================
# SEATBELT Library: Scoring & Health Calculations
# ============================================================================
# Provides weighted health scoring and grade calculations.
# Compatible with bash 3.2+ (macOS default)
# ============================================================================

# Health score weights (must sum to 100)
WEIGHT_AUTH=25
WEIGHT_SECURITY=25
WEIGHT_MCP=20
WEIGHT_STRUCTURE=15
WEIGHT_FRESHNESS=15

# Category scores (0-100) - initialized in main script
# These are accessed via CATEGORY_SCORES_* pattern for bash 3.2 compatibility

# Initialize category scores
init_category_scores() {
    CATEGORY_SCORES_authentication=0
    CATEGORY_SCORES_security=0
    CATEGORY_SCORES_mcp_health=0
    CATEGORY_SCORES_structure=0
    CATEGORY_SCORES_freshness=0
}

# Optimization recommendations array
OPTIMIZATIONS_COUNT=0

# Calculate weighted overall health score
calculate_overall_health() {
    local auth_score=${CATEGORY_SCORES_authentication:-0}
    local security_score=${CATEGORY_SCORES_security:-0}
    local mcp_score=${CATEGORY_SCORES_mcp_health:-0}
    local structure_score=${CATEGORY_SCORES_structure:-0}
    local freshness_score=${CATEGORY_SCORES_freshness:-0}

    local weighted_score=$((
        (auth_score * WEIGHT_AUTH / 100) +
        (security_score * WEIGHT_SECURITY / 100) +
        (mcp_score * WEIGHT_MCP / 100) +
        (structure_score * WEIGHT_STRUCTURE / 100) +
        (freshness_score * WEIGHT_FRESHNESS / 100)
    ))

    echo "$weighted_score"
}

# Convert score to letter grade
score_to_grade() {
    local score=$1
    if [[ $score -ge 95 ]]; then echo "A+"
    elif [[ $score -ge 90 ]]; then echo "A"
    elif [[ $score -ge 85 ]]; then echo "A-"
    elif [[ $score -ge 80 ]]; then echo "B+"
    elif [[ $score -ge 75 ]]; then echo "B"
    elif [[ $score -ge 70 ]]; then echo "B-"
    elif [[ $score -ge 65 ]]; then echo "C+"
    elif [[ $score -ge 60 ]]; then echo "C"
    elif [[ $score -ge 55 ]]; then echo "C-"
    elif [[ $score -ge 50 ]]; then echo "D"
    else echo "F"
    fi
}

# Convert score to descriptor
score_to_descriptor() {
    local score=$1
    if [[ $score -ge 90 ]]; then echo "Excellent"
    elif [[ $score -ge 80 ]]; then echo "Good"
    elif [[ $score -ge 70 ]]; then echo "Fair"
    elif [[ $score -ge 60 ]]; then echo "Needs Attention"
    else echo "Critical"
    fi
}

# Generate progress bar
progress_bar() {
    local score=$1
    local width=${2:-20}
    local filled=$((score * width / 100))
    local empty=$((width - filled))

    local bar=""
    local i=0
    while [[ $i -lt $filled ]]; do
        bar+="█"
        ((i++))
    done
    i=0
    while [[ $i -lt $empty ]]; do
        bar+="░"
        ((i++))
    done
    echo "$bar"
}

# Add optimization recommendation
# Usage: add_optimization "HIGH" "MCP" "Title" "Description" "Impact description"
add_optimization() {
    local priority=$1
    local category=$2
    local title=$3
    local description=$4
    local impact=$5

    eval "OPTIMIZATION_${OPTIMIZATIONS_COUNT}=\"${priority}|${category}|${title}|${description}|${impact}\""
    ((OPTIMIZATIONS_COUNT++))
}

# Get optimization by index
get_optimization() {
    local index=$1
    eval "echo \"\$OPTIMIZATION_${index}\""
}

# Calculate authentication score
# Params: core_authenticated total_core optional_authenticated total_optional
calculate_auth_score() {
    local core_auth=$1
    local core_total=$2
    local optional_auth=$3
    local optional_total=$4

    # Core services are 80% of score, optional are 20%
    local core_score=0
    local optional_score=0

    if [[ $core_total -gt 0 ]]; then
        core_score=$((core_auth * 100 / core_total))
    fi

    if [[ $optional_total -gt 0 ]]; then
        optional_score=$((optional_auth * 100 / optional_total))
    else
        optional_score=100  # No optional = full marks
    fi

    echo $(( (core_score * 80 / 100) + (optional_score * 20 / 100) ))
}

# Calculate MCP health score based on multiple factors
# Params: parity_score performance_score config_validity_score
calculate_mcp_score() {
    local parity=$1        # How well synced are tools (0-100)
    local performance=$2   # Estimated performance impact (0-100, 100=optimal)
    local validity=$3      # Config file validity (0-100)

    # Weighted: validity 40%, parity 35%, performance 25%
    echo $(( (validity * 40 / 100) + (parity * 35 / 100) + (performance * 25 / 100) ))
}

# Estimate MCP performance score based on server count
estimate_mcp_performance() {
    local server_count=$1

    # Optimal: 6-8 servers
    # Each server beyond 8 reduces score
    # Formula: 100 - (max(0, servers - 8) * 5)

    if [[ $server_count -le 8 ]]; then
        echo 100
    else
        local penalty=$(( (server_count - 8) * 5 ))
        local score=$((100 - penalty))
        [[ $score -lt 0 ]] && score=0
        echo $score
    fi
}

# Estimate memory overhead for MCP servers
estimate_memory_mb() {
    local server_count=$1
    # ~35MB per MCP server on average
    echo $((server_count * 35))
}

# Estimate failure probability percentage
estimate_failure_probability() {
    local server_count=$1
    # ~1% per server, compounding
    local prob=$server_count
    [[ $prob -gt 50 ]] && prob=50  # Cap at 50%
    echo $prob
}

# Initialize on source
init_category_scores
