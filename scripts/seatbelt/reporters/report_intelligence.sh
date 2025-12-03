#!/bin/bash
# ============================================================================
# SEATBELT Reporter: Intelligence Report
# ============================================================================
# Generates the comprehensive, contextual intelligence report.
# Compatible with bash 3.2+ (macOS default)
# ============================================================================

generate_intelligence_report() {
    local overall_score=${HEALTH_RESULTS_overall_score:-0}
    local grade=${HEALTH_RESULTS_grade:-"?"}
    local descriptor=${HEALTH_RESULTS_descriptor:-"Unknown"}

    # Header
    print_report_header

    # System & User Settings (NEW)
    print_system_section

    # Health Score Section
    print_health_score_section

    # Authentication Status
    print_auth_section

    # MCP Server Analysis
    print_mcp_section

    # Security Posture
    print_security_section

    # Project Structure
    print_structure_section

    # Optimization Recommendations
    print_recommendations_section

    # Verdict
    print_verdict_banner
}

print_report_header() {
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║                                                                        ║${NC}"
    echo -e "${BOLD}${CYAN}║   🪢  SEATBELT Intelligence Report                                     ║${NC}"
    echo -e "${BOLD}${CYAN}║       PrayerMap Configuration Analysis                                 ║${NC}"
    echo -e "${BOLD}${CYAN}║                                                                        ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "   ${GRAY}Generated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "   ${GRAY}Project: $PROJECT_ROOT${NC}"
}

print_system_section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}💻 SYSTEM ENVIRONMENT${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo ""
    echo -e "   ${BOLD}Machine:${NC}"

    # OS info
    local os_display="${SYSTEM_STATS_os_name:-$(uname)} ${SYSTEM_STATS_os_version:-}"
    if [[ -n "${SYSTEM_STATS_os_codename:-}" ]]; then
        os_display="$os_display (${SYSTEM_STATS_os_codename})"
    fi
    printf "   %-18s %s\n" "Operating System:" "$os_display"

    # Architecture/Chip
    local arch="${SYSTEM_STATS_arch:-$(uname -m)}"
    local chip="${SYSTEM_STATS_chip_type:-}"
    if [[ -n "$chip" ]]; then
        printf "   %-18s %s (%s)\n" "Architecture:" "$arch" "$chip"
    else
        printf "   %-18s %s\n" "Architecture:" "$arch"
    fi

    # Hardware
    printf "   %-18s %s cores\n" "CPU:" "${SYSTEM_STATS_cpu_cores:-?}"
    printf "   %-18s %sGB\n" "Memory:" "${SYSTEM_STATS_memory_gb:-?}"
    printf "   %-18s %sGB free\n" "Disk Space:" "${SYSTEM_STATS_disk_free_gb:-?}"

    echo ""
    echo -e "   ${BOLD}Development Tools:${NC}"

    # Shell
    printf "   %-18s %s\n" "Shell:" "${SYSTEM_STATS_shell:-$SHELL}"
    printf "   %-18s %s\n" "Terminal:" "${SYSTEM_STATS_terminal:-unknown}"

    # Node
    if [[ -n "${DEV_ENV_node_version:-}" ]]; then
        local nvm_status=""
        [[ "${DEV_ENV_nvm_installed:-false}" == "true" ]] && nvm_status=" (via nvm)"
        printf "   %-18s v%s%s\n" "Node.js:" "$DEV_ENV_node_version" "$nvm_status"
    else
        printf "   %-18s ${RED}not installed${NC}\n" "Node.js:"
    fi

    # NPM
    if [[ -n "${DEV_ENV_npm_version:-}" ]]; then
        printf "   %-18s v%s\n" "npm:" "$DEV_ENV_npm_version"
    fi

    # Git
    if [[ -n "${DEV_ENV_git_version:-}" ]]; then
        printf "   %-18s v%s\n" "Git:" "$DEV_ENV_git_version"
    fi

    # Homebrew
    if [[ "${DEV_ENV_homebrew_installed:-false}" == "true" ]]; then
        printf "   %-18s %s packages\n" "Homebrew:" "${DEV_ENV_homebrew_packages:-?}"
    fi

    # Docker
    if command -v docker &> /dev/null; then
        if [[ "${DEV_ENV_docker_running:-false}" == "true" ]]; then
            printf "   %-18s ${GREEN}running${NC}\n" "Docker:"
        else
            printf "   %-18s ${YELLOW}installed, not running${NC}\n" "Docker:"
        fi
    fi

    # Python
    if [[ -n "${DEV_ENV_python_version:-}" ]]; then
        printf "   %-18s v%s\n" "Python:" "$DEV_ENV_python_version"
    fi

    echo ""
    echo -e "   ${BOLD}User Settings:${NC}"

    # Git identity
    if [[ -n "${USER_SETTINGS_git_name:-}" ]]; then
        printf "   %-18s %s <%s>\n" "Git Identity:" "$USER_SETTINGS_git_name" "${USER_SETTINGS_git_email:-}"
    else
        printf "   %-18s ${YELLOW}not configured${NC}\n" "Git Identity:"
    fi

    # Default branch
    printf "   %-18s %s\n" "Default Branch:" "${USER_SETTINGS_default_branch:-master}"

    # SSH keys
    local ssh_count=${USER_SETTINGS_ssh_keys_count:-0}
    if [[ $ssh_count -gt 0 ]]; then
        printf "   %-18s ${GREEN}%s key(s)${NC}\n" "SSH Keys:" "$ssh_count"
    else
        printf "   %-18s ${YELLOW}none found${NC}\n" "SSH Keys:"
    fi

    # GPG
    if [[ "${USER_SETTINGS_gpg_configured:-false}" == "true" ]]; then
        printf "   %-18s ${GREEN}configured${NC}\n" "GPG Signing:"
    else
        printf "   %-18s ${GRAY}not configured${NC}\n" "GPG Signing:"
    fi

    # Editor
    printf "   %-18s %s\n" "Editor:" "${USER_SETTINGS_editor:-not set}"

    # Shell config
    if [[ -n "${USER_SETTINGS_shell_config:-}" ]]; then
        printf "   %-18s ~/%s\n" "Shell Config:" "$USER_SETTINGS_shell_config"
    fi
}

print_health_score_section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}📊 CONFIGURATION HEALTH${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local score=${HEALTH_RESULTS_overall_score:-0}
    local grade=${HEALTH_RESULTS_grade:-"?"}
    local descriptor=${HEALTH_RESULTS_descriptor:-"Unknown"}

    # Color based on score
    local score_color=$GREEN
    [[ $score -lt 60 ]] && score_color=$RED
    [[ $score -ge 60 && $score -lt 80 ]] && score_color=$YELLOW

    echo ""
    echo -e "   ${score_color}${BOLD}${score}/100${NC} ${GRAY}(${grade})${NC} - ${descriptor}"
    echo ""

    # Visual bar
    local bar=$(progress_bar $score 30)
    echo -e "   ${score_color}${bar}${NC}"
    echo ""

    # Category breakdown
    echo -e "   ${GRAY}Category Breakdown:${NC}"
    print_score_line "Authentication" "${CATEGORY_SCORES_authentication:-0}"
    print_score_line "Security" "${CATEGORY_SCORES_security:-0}"
    print_score_line "MCP Health" "${CATEGORY_SCORES_mcp_health:-0}"
    print_score_line "Structure" "${CATEGORY_SCORES_structure:-0}"
    print_score_line "Freshness" "${CATEGORY_SCORES_freshness:-0}"
}

print_score_line() {
    local label=$1
    local score=$2
    local bar=$(progress_bar $score 15)

    local color=$GREEN
    [[ $score -lt 60 ]] && color=$RED
    [[ $score -ge 60 && $score -lt 80 ]] && color=$YELLOW

    printf "   %-15s ${color}%s${NC} %d/100\n" "$label" "$bar" "$score"
}

print_auth_section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}🔐 AUTHENTICATION STATUS${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo ""
    echo -e "   ${BOLD}Core Services:${NC}"

    # GitHub
    if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} GitHub CLI: Authenticated"
    else
        echo -e "   ${RED}✗${NC} GitHub CLI: Not authenticated"
    fi

    # Supabase
    if [[ -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]]; then
        local ref=$(cat "$PROJECT_ROOT/supabase/.temp/project-ref")
        echo -e "   ${GREEN}✓${NC} Supabase: Linked to ${ref}"
    else
        echo -e "   ${RED}✗${NC} Supabase: Not linked"
    fi

    # Git
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        echo -e "   ${GREEN}✓${NC} Git: Repository initialized"
    else
        echo -e "   ${RED}✗${NC} Git: Not a repository"
    fi

    echo ""
    echo -e "   ${BOLD}Optional Services:${NC}"

    # Vercel
    if command -v vercel &> /dev/null; then
        local vercel_user=$(vercel whoami 2>/dev/null)
        if [[ -n "$vercel_user" ]]; then
            echo -e "   ${GREEN}✓${NC} Vercel: Authenticated as $vercel_user"
        elif [[ -f "$PROJECT_ROOT/.vercel/project.json" ]]; then
            echo -e "   ${YELLOW}⚠${NC} Vercel: Project linked, CLI needs login"
        else
            echo -e "   ${GRAY}○${NC} Vercel: Not configured"
        fi
    else
        echo -e "   ${GRAY}○${NC} Vercel: CLI not installed"
    fi

    # AWS
    if command -v aws &> /dev/null && aws sts get-caller-identity &> /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} AWS: Authenticated"
    else
        echo -e "   ${GRAY}○${NC} AWS: Not configured (optional)"
    fi
}

print_mcp_section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}🔌 MCP SERVER ANALYSIS${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo ""
    echo -e "   ${BOLD}Server Distribution:${NC}"
    printf "   %-20s %s\n" "Claude Desktop:" "${MCP_STATS_claude_desktop_count:-0} servers"
    printf "   %-20s %s\n" "Cursor:" "${MCP_STATS_cursor_count:-0} servers"
    printf "   %-20s %s\n" "Claude Code:" "${MCP_STATS_claude_code_count:-0} servers"
    printf "   %-20s %s\n" "Unique Total:" "${MCP_STATS_unique_servers:-0} servers"
    echo ""
    printf "   %-20s %s%%\n" "Parity Score:" "${MCP_STATS_parity_score:-0}"

    echo ""
    echo -e "   ${BOLD}Performance Impact:${NC}"
    printf "   %-20s ~%sMB\n" "Memory Overhead:" "${MCP_STATS_memory_estimate_mb:-0}"
    printf "   %-20s ~%sms\n" "Startup Delay:" "${MCP_STATS_startup_delay_ms:-0}"
    printf "   %-20s ~%s%%\n" "Failure Risk:" "${MCP_STATS_failure_probability:-0}"

    # Performance advisory
    local perf_score=${MCP_STATS_performance_score:-100}
    if [[ $perf_score -lt 80 ]]; then
        echo ""
        echo -e "   ${YELLOW}┌─ ⚠ Performance Advisory${NC}"
        echo -e "   ${YELLOW}│${NC}  Running ${MCP_STATS_claude_desktop_count:-0} servers impacts startup time."
        echo -e "   ${YELLOW}│${NC}  Consider reducing to 8 or fewer for optimal performance."
        echo -e "   ${YELLOW}└─────────────────────────────────────────${NC}"
    fi
}

print_security_section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}🛡️ SECURITY POSTURE${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local sec_score=${CATEGORY_SCORES_security:-0}
    echo ""
    print_score_line "Security Score" "$sec_score"

    echo ""
    echo -e "   ${BOLD}Checks:${NC}"

    # .env.local protection (also check for *.local pattern)
    if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
        if grep -qE "\.env\.local|\*\.local" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
            echo -e "   ${GREEN}✓${NC} Env Protection: .env.local in .gitignore"
        else
            echo -e "   ${RED}✗${NC} Env Protection: .env.local NOT protected!"
        fi
    else
        echo -e "   ${YELLOW}⚠${NC} Env Protection: .env.local not found"
    fi

    # VITE prefix check
    if [[ ${SECURITY_STATS_vite_prefix_violations:-0} -eq 0 ]]; then
        echo -e "   ${GREEN}✓${NC} Client Exposure: No server secrets with VITE_ prefix"
    else
        echo -e "   ${RED}✗${NC} Client Exposure: ${SECURITY_STATS_vite_prefix_violations} secrets exposed"
    fi

    # Secrets count
    echo -e "   ${CYAN}ℹ${NC} Token Count: ${SECURITY_STATS_secrets_in_env_local:-0} secrets in .env.local"
}

print_structure_section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}📁 PROJECT STRUCTURE${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local struct_score=${CATEGORY_SCORES_structure:-0}
    echo ""
    print_score_line "Structure Score" "$struct_score"

    echo ""
    # Migration count
    local migration_count=$(ls -1 "$PROJECT_ROOT/supabase/migrations"/*.sql 2>/dev/null | wc -l | tr -d ' ')
    printf "   %-20s %s tracked\n" "SQL Migrations:" "$migration_count"

    # Claude Code config
    if [[ -f "$PROJECT_ROOT/.claude/settings.local.json" ]]; then
        echo -e "   ${GREEN}✓${NC} Claude Config: .claude/settings.local.json present"
    else
        echo -e "   ${YELLOW}⚠${NC} Claude Config: Missing .claude/settings.local.json"
    fi
}

print_recommendations_section() {
    [[ ${OPTIMIZATIONS_COUNT:-0} -eq 0 ]] && return

    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}💡 OPTIMIZATION OPPORTUNITIES${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local i=0
    while [[ $i -lt ${OPTIMIZATIONS_COUNT:-0} && $i -lt 5 ]]; do
        local opt=$(get_optimization $i)
        local priority=$(echo "$opt" | cut -d'|' -f1)
        local title=$(echo "$opt" | cut -d'|' -f3)
        local description=$(echo "$opt" | cut -d'|' -f4)
        local impact=$(echo "$opt" | cut -d'|' -f5)

        local color=$GREEN
        [[ "$priority" == "HIGH" ]] && color=$RED
        [[ "$priority" == "MEDIUM" ]] && color=$YELLOW

        echo ""
        echo -e "   ${color}${BOLD}${priority} IMPACT:${NC} ${BOLD}$title${NC}"
        echo -e "   ${GRAY}$description${NC}"
        echo -e "   → ${GREEN}Benefit:${NC} $impact"

        ((i++))
    done

    local remaining=$((${OPTIMIZATIONS_COUNT:-0} - i))
    if [[ $remaining -gt 0 ]]; then
        echo ""
        echo -e "   ${GRAY}... and $remaining more recommendations${NC}"
    fi
}

print_verdict_banner() {
    local verdict=${HEALTH_RESULTS_verdict:-"unknown"}
    local message=${HEALTH_RESULTS_verdict_message:-""}

    echo ""
    case $verdict in
        ready)
            echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${GREEN}${BOLD}  🚀 VERDICT: Ready to Develop${NC}"
            echo -e "${GREEN}  $message${NC}"
            echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            ;;
        warning)
            echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${YELLOW}${BOLD}  ⚠️ VERDICT: Proceed with Caution${NC}"
            echo -e "${YELLOW}  $message${NC}"
            echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            ;;
        blocked)
            echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}${BOLD}  ✗ VERDICT: Development Blocked${NC}"
            echo -e "${RED}  $message${NC}"
            echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            ;;
    esac
    echo ""
}

# Quick summary for pre-commit hook
generate_quick_summary() {
    local score=${HEALTH_RESULTS_overall_score:-0}
    local grade=${HEALTH_RESULTS_grade:-"?"}
    local verdict=${HEALTH_RESULTS_verdict:-"unknown"}

    if [[ "$verdict" == "blocked" ]]; then
        echo -e "${RED}SEATBELT: ${score}/100 (${grade}) - BLOCKED${NC}"
    elif [[ "$verdict" == "warning" ]]; then
        echo -e "${YELLOW}SEATBELT: ${score}/100 (${grade}) - Warnings${NC}"
    else
        echo -e "${GREEN}SEATBELT: ${score}/100 (${grade}) - Ready${NC}"
    fi
}
