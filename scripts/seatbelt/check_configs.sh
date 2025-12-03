#!/bin/bash
# ============================================================================
# 📋 SEATBELT Module: Configuration File Validation
# ============================================================================
# Validates JSON syntax and existence of critical configuration files.
# ============================================================================

check_configs() {
    # Claude Desktop config
    local claude_desktop="/Users/computer/Library/Application Support/Claude/claude_desktop_config.json"
    if [[ -f "$claude_desktop" ]]; then
        if python3 -m json.tool "$claude_desktop" > /dev/null 2>&1; then
            local server_count=$(grep -c '"command":' "$claude_desktop" 2>/dev/null || echo "0")
            log_pass "Claude Desktop" "Valid JSON - $server_count MCP servers"
        else
            log_fail "Claude Desktop" "Invalid JSON syntax"
        fi
    else
        log_warn "Claude Desktop" "Config not found"
    fi

    # Cursor MCP config
    local cursor_mcp="/Users/computer/.cursor/mcp.json"
    if [[ -f "$cursor_mcp" ]]; then
        if python3 -m json.tool "$cursor_mcp" > /dev/null 2>&1; then
            local server_count=$(grep -c '"command":' "$cursor_mcp" 2>/dev/null || echo "0")
            log_pass "Cursor MCP" "Valid JSON - $server_count MCP servers"
        else
            log_fail "Cursor MCP" "Invalid JSON syntax"
        fi
    else
        log_warn "Cursor MCP" "Config not found"
    fi

    # Claude Code project MCP config
    local claude_code_mcp="$PROJECT_ROOT/.mcp.json"
    if [[ -f "$claude_code_mcp" ]]; then
        if python3 -m json.tool "$claude_code_mcp" > /dev/null 2>&1; then
            local server_count=$(grep -c '"command":' "$claude_code_mcp" 2>/dev/null || echo "0")
            log_pass "Claude Code MCP" "Valid JSON - $server_count MCP servers"
        else
            log_fail "Claude Code MCP" "Invalid JSON syntax"
        fi
    else
        log_warn "Claude Code MCP" "Config not found at $claude_code_mcp"
    fi

    # Git config
    local gitconfig="$HOME/.gitconfig"
    if [[ -f "$gitconfig" ]]; then
        local git_name=$(git config --global user.name 2>/dev/null)
        local git_email=$(git config --global user.email 2>/dev/null)
        if [[ -n "$git_name" && -n "$git_email" ]]; then
            log_pass "Git Config" "Identity: $git_name <$git_email>"
        else
            log_warn "Git Config" "Missing user.name or user.email"
        fi
    else
        log_fail "Git Config" "~/.gitconfig not found"
    fi

    # Global gitignore
    local gitignore_global="$HOME/.gitignore_global"
    if [[ -f "$gitignore_global" ]]; then
        log_pass "Git Ignore Global" "Found"
    else
        log_info "Git Ignore Global not found (optional)"
    fi

    # Vercel project config
    local vercel_json="$PROJECT_ROOT/vercel.json"
    if [[ -f "$vercel_json" ]]; then
        if python3 -m json.tool "$vercel_json" > /dev/null 2>&1; then
            log_pass "Vercel Config" "Valid JSON"
        else
            log_fail "Vercel Config" "Invalid JSON syntax"
        fi
    else
        log_info "vercel.json not found (optional)"
    fi

    # TypeScript config
    local tsconfig="$PROJECT_ROOT/tsconfig.json"
    if [[ -f "$tsconfig" ]]; then
        if python3 -m json.tool "$tsconfig" > /dev/null 2>&1; then
            log_pass "TypeScript Config" "Valid JSON"
        else
            log_fail "TypeScript Config" "Invalid JSON syntax"
        fi
    else
        log_warn "TypeScript Config" "tsconfig.json not found"
    fi

    # Package.json
    local package_json="$PROJECT_ROOT/package.json"
    if [[ -f "$package_json" ]]; then
        if python3 -m json.tool "$package_json" > /dev/null 2>&1; then
            local pkg_name=$(python3 -c "import json; print(json.load(open('$package_json')).get('name', 'unknown'))" 2>/dev/null)
            log_pass "Package.json" "Valid JSON - $pkg_name"
        else
            log_fail "Package.json" "Invalid JSON syntax"
        fi
    else
        log_fail "Package.json" "Not found"
    fi

    # MCP Server Parity Check
    check_mcp_parity
}

check_mcp_parity() {
    local claude_desktop="/Users/computer/Library/Application Support/Claude/claude_desktop_config.json"
    local cursor_mcp="/Users/computer/.cursor/mcp.json"
    local claude_code_mcp="$PROJECT_ROOT/.mcp.json"

    if [[ -f "$claude_desktop" && -f "$cursor_mcp" ]]; then
        local cd_servers=$(grep -oP '"[a-z-]+"\s*:\s*\{' "$claude_desktop" 2>/dev/null | wc -l)
        local cursor_servers=$(grep -oP '"[a-z-]+"\s*:\s*\{' "$cursor_mcp" 2>/dev/null | wc -l)

        if [[ "$cd_servers" -eq "$cursor_servers" ]]; then
            log_pass "MCP Parity" "Claude Desktop and Cursor have same server count ($cd_servers)"
        else
            log_warn "MCP Parity" "Server count mismatch - Claude Desktop: $cd_servers, Cursor: $cursor_servers"
        fi
    fi
}
