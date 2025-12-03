#!/bin/bash
# ============================================================================
# SEATBELT Analyzer: MCP Server Analysis
# ============================================================================
# Analyzes MCP server configuration across tools for:
# - Performance impact estimation
# - Parity scoring between tools
# - Usage optimization recommendations
# Compatible with bash 3.2+ (macOS default)
# ============================================================================

# MCP Analysis results - using simple variables for bash 3.2 compatibility
MCP_STATS_claude_desktop_count=0
MCP_STATS_cursor_count=0
MCP_STATS_claude_code_count=0
MCP_STATS_total_instances=0
MCP_STATS_unique_servers=0
MCP_STATS_parity_score=0
MCP_STATS_performance_score=0
MCP_STATS_memory_estimate_mb=0
MCP_STATS_startup_delay_ms=0
MCP_STATS_failure_probability=0

# Server lists stored in temp files for bash 3.2 compatibility
MCP_SERVERS_FILE_CD="/tmp/seatbelt_mcp_cd.$$"
MCP_SERVERS_FILE_CU="/tmp/seatbelt_mcp_cu.$$"
MCP_SERVERS_FILE_CC="/tmp/seatbelt_mcp_cc.$$"
MCP_SERVERS_FILE_ALL="/tmp/seatbelt_mcp_all.$$"
MCP_MISSING_FILE="/tmp/seatbelt_mcp_missing.$$"

cleanup_mcp_temps() {
    rm -f "$MCP_SERVERS_FILE_CD" "$MCP_SERVERS_FILE_CU" "$MCP_SERVERS_FILE_CC" "$MCP_SERVERS_FILE_ALL" "$MCP_MISSING_FILE" 2>/dev/null
}

analyze_mcp() {
    source "$SEATBELT_DIR/lib/project_context.sh" 2>/dev/null || true

    # Initialize temp files
    > "$MCP_SERVERS_FILE_CD"
    > "$MCP_SERVERS_FILE_CU"
    > "$MCP_SERVERS_FILE_CC"
    > "$MCP_SERVERS_FILE_ALL"
    > "$MCP_MISSING_FILE"

    # Parse MCP servers from each config
    parse_mcp_configs

    # Calculate statistics
    calculate_mcp_stats

    # Set MCP health score
    CATEGORY_SCORES_mcp_health=$MCP_STATS_performance_score

    # Cleanup on exit
    trap cleanup_mcp_temps EXIT
}

parse_mcp_configs() {
    local claude_desktop_config="/Users/computer/Library/Application Support/Claude/claude_desktop_config.json"
    local cursor_config="/Users/computer/.cursor/mcp.json"
    local claude_code_config="$PROJECT_ROOT/.mcp.json"

    # Parse Claude Desktop
    if [[ -f "$claude_desktop_config" ]]; then
        python3 -c "
import json
try:
    with open('$claude_desktop_config') as f:
        data = json.load(f)
        for server in data.get('mcpServers', {}).keys():
            print(server)
except: pass
" 2>/dev/null > "$MCP_SERVERS_FILE_CD"
    fi

    # Parse Cursor
    if [[ -f "$cursor_config" ]]; then
        python3 -c "
import json
try:
    with open('$cursor_config') as f:
        data = json.load(f)
        for server in data.get('mcpServers', {}).keys():
            print(server)
except: pass
" 2>/dev/null > "$MCP_SERVERS_FILE_CU"
    fi

    # Parse Claude Code
    if [[ -f "$claude_code_config" ]]; then
        python3 -c "
import json
try:
    with open('$claude_code_config') as f:
        data = json.load(f)
        for server in data.get('mcpServers', {}).keys():
            print(server)
except: pass
" 2>/dev/null > "$MCP_SERVERS_FILE_CC"
    fi

    # Get unique servers across all tools
    cat "$MCP_SERVERS_FILE_CD" "$MCP_SERVERS_FILE_CU" "$MCP_SERVERS_FILE_CC" 2>/dev/null | sort -u > "$MCP_SERVERS_FILE_ALL"
}

calculate_mcp_stats() {
    MCP_STATS_claude_desktop_count=$(wc -l < "$MCP_SERVERS_FILE_CD" 2>/dev/null | tr -d ' ' || echo 0)
    MCP_STATS_cursor_count=$(wc -l < "$MCP_SERVERS_FILE_CU" 2>/dev/null | tr -d ' ' || echo 0)
    MCP_STATS_claude_code_count=$(wc -l < "$MCP_SERVERS_FILE_CC" 2>/dev/null | tr -d ' ' || echo 0)
    MCP_STATS_unique_servers=$(wc -l < "$MCP_SERVERS_FILE_ALL" 2>/dev/null | tr -d ' ' || echo 0)

    # Total instances across all tools
    MCP_STATS_total_instances=$((
        MCP_STATS_claude_desktop_count +
        MCP_STATS_cursor_count +
        MCP_STATS_claude_code_count
    ))

    # Calculate parity score
    if [[ $MCP_STATS_unique_servers -gt 0 ]]; then
        local in_all=0
        while IFS= read -r server; do
            [[ -z "$server" ]] && continue
            local in_cd=0 in_cu=0 in_cc=0
            grep -qx "$server" "$MCP_SERVERS_FILE_CD" 2>/dev/null && in_cd=1
            grep -qx "$server" "$MCP_SERVERS_FILE_CU" 2>/dev/null && in_cu=1
            grep -qx "$server" "$MCP_SERVERS_FILE_CC" 2>/dev/null && in_cc=1

            # Count as "in all" if in at least 2 of 3
            [[ $((in_cd + in_cu + in_cc)) -ge 2 ]] && ((in_all++))

            # Track missing
            local missing=""
            [[ $in_cd -eq 0 ]] && missing+="CD "
            [[ $in_cu -eq 0 ]] && missing+="CU "
            [[ $in_cc -eq 0 ]] && missing+="CC "
            [[ -n "$missing" ]] && echo "$server:$missing" >> "$MCP_MISSING_FILE"
        done < "$MCP_SERVERS_FILE_ALL"

        MCP_STATS_parity_score=$((in_all * 100 / MCP_STATS_unique_servers))
    else
        MCP_STATS_parity_score=100
    fi

    # Performance calculations
    local max_servers=$MCP_STATS_claude_desktop_count

    # Memory: ~35MB per server
    MCP_STATS_memory_estimate_mb=$((max_servers * 35))

    # Startup delay: ~300ms per server
    MCP_STATS_startup_delay_ms=$((max_servers * 300))

    # Failure probability: ~1% per server
    MCP_STATS_failure_probability=$max_servers
    [[ $MCP_STATS_failure_probability -gt 50 ]] && MCP_STATS_failure_probability=50

    # Performance score: optimal is 6-8 servers
    if [[ $max_servers -le 8 ]]; then
        MCP_STATS_performance_score=100
    elif [[ $max_servers -le 10 ]]; then
        MCP_STATS_performance_score=$((100 - (max_servers - 8) * 10))
    elif [[ $max_servers -le 15 ]]; then
        MCP_STATS_performance_score=$((80 - (max_servers - 10) * 5))
    else
        MCP_STATS_performance_score=$((55 - (max_servers - 15) * 3))
        [[ $MCP_STATS_performance_score -lt 20 ]] && MCP_STATS_performance_score=20
    fi
}

generate_mcp_recommendations() {
    local max_servers=$MCP_STATS_claude_desktop_count

    # Too many servers recommendation
    if [[ $max_servers -gt 10 ]]; then
        local excess=$((max_servers - 8))
        local memory_save=$((excess * 35))
        local time_save=$((excess * 300))

        add_optimization "HIGH" "MCP" \
            "Reduce MCP server count" \
            "Running $max_servers servers. Optimal is 6-8 for performance." \
            "Remove $excess rarely-used servers to save ~${memory_save}MB RAM and ~${time_save}ms startup"
    fi

    # Parity issues
    if [[ $MCP_STATS_parity_score -lt 80 ]]; then
        add_optimization "MEDIUM" "MCP" \
            "Synchronize MCP servers across tools" \
            "Parity score: ${MCP_STATS_parity_score}%. Some servers missing from certain tools." \
            "Sync configs to ensure consistent capability across Claude Desktop, Cursor, and Claude Code"
    fi
}
