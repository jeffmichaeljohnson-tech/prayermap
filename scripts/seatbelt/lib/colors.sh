#!/bin/bash
# ============================================================================
# SEATBELT Library: Colors & Formatting
# ============================================================================
# Terminal colors and formatting utilities.
# ============================================================================

# Check if we should use colors
use_colors() {
    [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]] && [[ "${TERM:-dumb}" != "dumb" ]]
}

# Define colors (only if terminal supports them)
if use_colors; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    MAGENTA='\033[0;35m'
    WHITE='\033[1;37m'
    GRAY='\033[0;90m'
    NC='\033[0m'  # No Color
    BOLD='\033[1m'
    DIM='\033[2m'
    UNDERLINE='\033[4m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' MAGENTA='' WHITE='' GRAY='' NC='' BOLD='' DIM='' UNDERLINE=''
fi

# Status icons
ICON_PASS="✓"
ICON_FAIL="✗"
ICON_WARN="⚠"
ICON_INFO="ℹ"
ICON_ARROW="→"
ICON_BULLET="•"
ICON_STAR="★"
ICON_LIGHTNING="⚡"
ICON_LOCK="🔒"
ICON_UNLOCK="🔓"
ICON_CHART="📊"
ICON_PLUG="🔌"
ICON_SHIELD="🛡"
ICON_FOLDER="📁"
ICON_CLOCK="🕐"
ICON_TARGET="🎯"
ICON_WRENCH="🔧"
ICON_BULB="💡"
ICON_ROCKET="🚀"

# Print colored text
cprint() {
    local color=$1
    shift
    echo -e "${color}$*${NC}"
}

# Print section header
print_section() {
    local title=$1
    local icon=${2:-""}
    echo ""
    cprint "$BOLD$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [[ -n "$icon" ]]; then
        cprint "$BOLD$WHITE" "$icon $title"
    else
        cprint "$BOLD$WHITE" "$title"
    fi
    cprint "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Print subsection
print_subsection() {
    local title=$1
    echo ""
    cprint "$BOLD$BLUE" "─── $title ───"
}

# Print key-value pair with alignment
print_kv() {
    local key=$1
    local value=$2
    local width=${3:-20}
    printf "   ${GRAY}%-${width}s${NC} %s\n" "$key:" "$value"
}

# Print status line
print_status() {
    local status=$1  # pass, fail, warn, info
    local label=$2
    local message=$3

    case $status in
        pass)
            echo -e "   ${GREEN}${ICON_PASS}${NC} ${label}: ${message}"
            ;;
        fail)
            echo -e "   ${RED}${ICON_FAIL}${NC} ${label}: ${message}"
            ;;
        warn)
            echo -e "   ${YELLOW}${ICON_WARN}${NC} ${label}: ${message}"
            ;;
        info)
            echo -e "   ${CYAN}${ICON_INFO}${NC} ${label}: ${message}"
            ;;
    esac
}

# Print recommendation
print_recommendation() {
    local priority=$1
    local title=$2
    local description=$3
    local impact=$4

    local color=$GREEN
    local priority_label="LOW"

    case $priority in
        HIGH)
            color=$RED
            priority_label="HIGH IMPACT"
            ;;
        MEDIUM)
            color=$YELLOW
            priority_label="MEDIUM IMPACT"
            ;;
        LOW)
            color=$CYAN
            priority_label="LOW IMPACT"
            ;;
    esac

    echo ""
    echo -e "   ${color}${BOLD}${priority_label}:${NC} ${BOLD}$title${NC}"
    echo -e "   ${GRAY}$description${NC}"
    echo -e "   ${ICON_ARROW} ${GREEN}Benefit:${NC} $impact"
}

# Print score with visual bar
print_score() {
    local label=$1
    local score=$2
    local max=${3:-100}
    local bar_width=20

    local filled=$((score * bar_width / max))
    local empty=$((bar_width - filled))

    # Color based on score
    local bar_color=$GREEN
    if [[ $score -lt 60 ]]; then
        bar_color=$RED
    elif [[ $score -lt 80 ]]; then
        bar_color=$YELLOW
    fi

    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done

    printf "   %-20s ${bar_color}%s${NC} %d/%d\n" "$label" "$bar" "$score" "$max"
}

# Print advisory box
print_advisory() {
    local type=$1  # warning, info, tip
    local title=$2
    local message=$3

    local color=$CYAN
    local icon=$ICON_INFO

    case $type in
        warning)
            color=$YELLOW
            icon=$ICON_WARN
            ;;
        danger)
            color=$RED
            icon=$ICON_FAIL
            ;;
        tip)
            color=$GREEN
            icon=$ICON_BULB
            ;;
    esac

    echo ""
    echo -e "   ${color}┌─ ${icon} ${BOLD}${title}${NC}"
    echo -e "   ${color}│${NC}  $message"
    echo -e "   ${color}└─────────────────────────────────────────${NC}"
}

# Print verdict banner
print_verdict() {
    local status=$1   # ready, warning, blocked
    local message=$2

    echo ""
    case $status in
        ready)
            cprint "$GREEN$BOLD" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            cprint "$GREEN$BOLD" "  ${ICON_ROCKET} VERDICT: Ready to Develop"
            cprint "$GREEN" "  $message"
            cprint "$GREEN$BOLD" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ;;
        warning)
            cprint "$YELLOW$BOLD" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            cprint "$YELLOW$BOLD" "  ${ICON_WARN} VERDICT: Proceed with Caution"
            cprint "$YELLOW" "  $message"
            cprint "$YELLOW$BOLD" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ;;
        blocked)
            cprint "$RED$BOLD" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            cprint "$RED$BOLD" "  ${ICON_FAIL} VERDICT: Development Blocked"
            cprint "$RED" "  $message"
            cprint "$RED$BOLD" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ;;
    esac
    echo ""
}
