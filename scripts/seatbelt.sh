#!/bin/bash
# ============================================================================
# 🪢 SEATBELT - Intelligent Configuration Audit System
# ============================================================================
#
# Usage: ./scripts/seatbelt.sh [options]
#
# Options:
#   --quick       Run essential checks only (auth + JSON validation)
#   --full        Run full analysis with intelligence report (default)
#   --keys-only   Only check API key health
#   --json        Output results as JSON
#   --ci          CI mode - exit 1 on any failure, minimal output
#   --summary     One-line summary (for pre-commit hooks)
#   --verbose     Show detailed output for each check
#   --help        Show this help message
#
# Exit codes:
#   0 - Health score >= 80 (Ready to develop)
#   1 - Critical failures or score < 60 (Blocked)
#   2 - Warnings or score 60-79 (Proceed with caution)
#
# ============================================================================

set -uo pipefail

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEATBELT_DIR="$SCRIPT_DIR/seatbelt"

# Configuration
OUTPUT_FORMAT="text"
RUN_MODE="full"
VERBOSE=false
CI_MODE=false
SUMMARY_ONLY=false

# Counters (for backward compatibility)
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

# ============================================================================
# Parse Arguments
# ============================================================================

show_help() {
    head -24 "$0" | tail -20
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            RUN_MODE="quick"
            shift
            ;;
        --full)
            RUN_MODE="full"
            shift
            ;;
        --keys-only)
            RUN_MODE="keys"
            shift
            ;;
        --json)
            OUTPUT_FORMAT="json"
            shift
            ;;
        --ci)
            CI_MODE=true
            OUTPUT_FORMAT="text"
            shift
            ;;
        --summary)
            SUMMARY_ONLY=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# ============================================================================
# Load Libraries
# ============================================================================

source "$SEATBELT_DIR/lib/colors.sh"
source "$SEATBELT_DIR/lib/scoring.sh"
source "$SEATBELT_DIR/lib/project_context.sh"

# ============================================================================
# Legacy logging functions (for check modules)
# ============================================================================

log_pass() {
    ((PASS_COUNT++))
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo "{\"status\":\"pass\",\"check\":\"$1\",\"message\":\"$2\"}"
    elif [[ "$VERBOSE" == true ]]; then
        echo -e "${GREEN}${ICON_PASS}${NC} $1: $2"
    fi
}

log_warn() {
    ((WARN_COUNT++))
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo "{\"status\":\"warn\",\"check\":\"$1\",\"message\":\"$2\"}"
    elif [[ "$VERBOSE" == true ]]; then
        echo -e "${YELLOW}${ICON_WARN}${NC} $1: $2"
    fi
}

log_fail() {
    ((FAIL_COUNT++))
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo "{\"status\":\"fail\",\"check\":\"$1\",\"message\":\"$2\"}"
    elif [[ "$VERBOSE" == true ]]; then
        echo -e "${RED}${ICON_FAIL}${NC} $1: $2"
    fi
}

log_info() {
    if [[ "$VERBOSE" == true && "$OUTPUT_FORMAT" != "json" ]]; then
        echo -e "${CYAN}${ICON_INFO}${NC} $1"
    fi
}

log_section() {
    if [[ "$VERBOSE" == true && "$OUTPUT_FORMAT" != "json" ]]; then
        echo ""
        echo -e "${BOLD}${BLUE}─── $1 ───${NC}"
    fi
}

# Export for modules
export PROJECT_ROOT SCRIPT_DIR SEATBELT_DIR
export OUTPUT_FORMAT VERBOSE CI_MODE
export PASS_COUNT WARN_COUNT FAIL_COUNT
export -f log_pass log_warn log_fail log_info log_section

# ============================================================================
# Run Check Module
# ============================================================================

run_module() {
    local module="$1"
    local module_path="$SEATBELT_DIR/${module}.sh"

    if [[ -f "$module_path" ]]; then
        source "$module_path"
        if declare -f "$module" > /dev/null; then
            "$module"
        fi
    fi
}

# ============================================================================
# Run Analyzer
# ============================================================================

run_analyzer() {
    local analyzer="$1"
    local analyzer_path="$SEATBELT_DIR/analyzers/${analyzer}.sh"

    if [[ -f "$analyzer_path" ]]; then
        source "$analyzer_path"
        if declare -f "$analyzer" > /dev/null; then
            "$analyzer"
        fi
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    case $RUN_MODE in
        quick)
            run_quick_mode
            ;;
        full)
            run_full_mode
            ;;
        keys)
            run_keys_mode
            ;;
    esac

    # Determine exit code
    determine_exit_code
}

run_quick_mode() {
    # Run essential checks only
    [[ "$VERBOSE" == true ]] && log_section "Authentication"
    run_module "check_auth"

    [[ "$VERBOSE" == true ]] && log_section "Configuration Files"
    run_module "check_configs"

    # Quick analyzers
    run_analyzer "analyze_security"
    run_analyzer "analyze_health"

    # Output
    if [[ "$SUMMARY_ONLY" == true ]]; then
        source "$SEATBELT_DIR/reporters/report_intelligence.sh"
        generate_quick_summary
    elif [[ "$OUTPUT_FORMAT" != "json" && "$CI_MODE" != true ]]; then
        print_quick_report
    fi
}

run_full_mode() {
    # Run all check modules (silently collect data)
    run_module "check_auth"
    run_module "check_configs"
    run_module "check_env"
    run_module "check_git"
    run_module "check_cli"
    run_module "check_structure"

    # Run analyzers
    run_analyzer "analyze_system"
    run_analyzer "analyze_mcp"
    run_analyzer "analyze_security"
    run_analyzer "analyze_health"

    # Generate recommendations from analyzers
    if declare -f "generate_mcp_recommendations" > /dev/null; then
        generate_mcp_recommendations
    fi
    if declare -f "generate_security_recommendations" > /dev/null; then
        generate_security_recommendations
    fi
    if declare -f "generate_system_recommendations" > /dev/null; then
        generate_system_recommendations
    fi

    # Output
    if [[ "$SUMMARY_ONLY" == true ]]; then
        source "$SEATBELT_DIR/reporters/report_intelligence.sh"
        generate_quick_summary
    elif [[ "$OUTPUT_FORMAT" == "json" ]]; then
        print_json_report
    elif [[ "$CI_MODE" == true ]]; then
        print_ci_report
    else
        source "$SEATBELT_DIR/reporters/report_intelligence.sh"
        generate_intelligence_report
    fi
}

run_keys_mode() {
    # Load env and run key checks
    run_module "check_keys"

    if [[ "$OUTPUT_FORMAT" != "json" ]]; then
        echo ""
        echo -e "${BOLD}API Key Health Check Complete${NC}"
        echo "Passed: $PASS_COUNT | Warnings: $WARN_COUNT | Failed: $FAIL_COUNT"
    fi
}

print_quick_report() {
    local score=${HEALTH_RESULTS[overall_score]:-0}
    local grade=${HEALTH_RESULTS[grade]:-"?"}

    echo ""
    echo -e "${BOLD}${CYAN}🪢 SEATBELT Quick Check${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "   Health Score: ${BOLD}${score}/100${NC} (${grade})"
    echo ""
    echo -e "   Passed:   ${GREEN}$PASS_COUNT${NC}"
    echo -e "   Warnings: ${YELLOW}$WARN_COUNT${NC}"
    echo -e "   Failed:   ${RED}$FAIL_COUNT${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [[ $FAIL_COUNT -gt 0 ]]; then
        echo -e "${RED}${BOLD}${ICON_FAIL} Development blocked - fix critical issues${NC}"
    elif [[ $WARN_COUNT -gt 0 ]]; then
        echo -e "${YELLOW}${BOLD}${ICON_WARN} Proceed with caution${NC}"
    else
        echo -e "${GREEN}${BOLD}${ICON_PASS} Ready to develop${NC}"
    fi
    echo ""
}

print_json_report() {
    cat <<EOF
{
  "health": {
    "score": ${HEALTH_RESULTS[overall_score]:-0},
    "grade": "${HEALTH_RESULTS[grade]:-?}",
    "verdict": "${HEALTH_RESULTS[verdict]:-unknown}"
  },
  "categories": {
    "authentication": ${CATEGORY_SCORES[authentication]:-0},
    "security": ${CATEGORY_SCORES[security]:-0},
    "mcp_health": ${CATEGORY_SCORES[mcp_health]:-0},
    "structure": ${CATEGORY_SCORES[structure]:-0},
    "freshness": ${CATEGORY_SCORES[freshness]:-0}
  },
  "mcp": {
    "total_servers": ${MCP_STATS[unique_servers]:-0},
    "parity_score": ${MCP_STATS[parity_score]:-0},
    "memory_mb": ${MCP_STATS[memory_estimate_mb]:-0},
    "failure_probability": ${MCP_STATS[failure_probability]:-0}
  },
  "counts": {
    "passed": $PASS_COUNT,
    "warnings": $WARN_COUNT,
    "failed": $FAIL_COUNT
  },
  "recommendations": ${#OPTIMIZATIONS[@]}
}
EOF
}

print_ci_report() {
    local score=${HEALTH_RESULTS[overall_score]:-0}
    echo "SEATBELT: ${score}/100 | Pass: $PASS_COUNT | Warn: $WARN_COUNT | Fail: $FAIL_COUNT"

    if [[ $FAIL_COUNT -gt 0 ]]; then
        echo "STATUS: BLOCKED"
    elif [[ $score -lt 60 ]]; then
        echo "STATUS: CRITICAL"
    elif [[ $score -lt 80 ]]; then
        echo "STATUS: WARNING"
    else
        echo "STATUS: OK"
    fi
}

determine_exit_code() {
    local score=${HEALTH_RESULTS_overall_score:-0}

    if [[ $FAIL_COUNT -gt 0 || $score -lt 60 ]]; then
        exit 1
    elif [[ $WARN_COUNT -gt 0 || $score -lt 80 ]]; then
        exit 2
    else
        exit 0
    fi
}

# ============================================================================
# Run
# ============================================================================

main
