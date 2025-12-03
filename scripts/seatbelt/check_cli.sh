#!/bin/bash
# ============================================================================
# 🔧 SEATBELT Module: CLI Tools & Project Linking
# ============================================================================
# Verifies CLI tools are installed and projects are properly linked.
# ============================================================================

check_cli() {
    # Node.js version
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_pass "Node.js" "Installed: $node_version"

        # Check if using NVM
        if [[ -n "$NVM_DIR" ]]; then
            log_info "Using NVM for Node version management"
        fi
    else
        log_fail "Node.js" "Not installed"
    fi

    # NPM
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        log_pass "NPM" "Installed: v$npm_version"
    else
        log_fail "NPM" "Not installed"
    fi

    # Check node_modules
    if [[ -d "$PROJECT_ROOT/node_modules" ]]; then
        local pkg_count=$(ls -1 "$PROJECT_ROOT/node_modules" 2>/dev/null | wc -l | tr -d ' ')
        log_pass "Dependencies" "$pkg_count packages installed"
    else
        log_warn "Dependencies" "node_modules not found - run: npm install"
    fi

    # Supabase CLI linking
    if command -v supabase &> /dev/null; then
        local supabase_version=$(supabase --version 2>/dev/null | head -1)
        log_pass "Supabase CLI" "$supabase_version"

        # Check if project is linked
        if [[ -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]]; then
            local project_ref=$(cat "$PROJECT_ROOT/supabase/.temp/project-ref")
            log_pass "Supabase Link" "Linked to project: $project_ref"
        elif [[ -d "$PROJECT_ROOT/supabase" ]]; then
            log_warn "Supabase Link" "supabase/ exists but project not linked. Run: supabase link"
        else
            log_warn "Supabase Link" "Not initialized. Run: supabase init && supabase link"
        fi

        # Check for config.toml
        if [[ -f "$PROJECT_ROOT/supabase/config.toml" ]]; then
            log_pass "Supabase Config" "config.toml found"
        else
            log_info "Supabase config.toml not found (created by supabase init)"
        fi
    fi

    # Vercel CLI linking
    if command -v vercel &> /dev/null; then
        local vercel_version=$(vercel --version 2>/dev/null)
        log_pass "Vercel CLI" "v$vercel_version"

        # Check if project is linked
        if [[ -f "$PROJECT_ROOT/.vercel/project.json" ]]; then
            local project_id=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/.vercel/project.json')).get('projectId', 'unknown'))" 2>/dev/null)
            log_pass "Vercel Link" "Linked to project: $project_id"
        else
            log_warn "Vercel Link" "Project not linked. Run: vercel link"
        fi
    fi

    # Docker (optional)
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null 2>&1; then
            log_pass "Docker" "Running"
        else
            log_info "Docker installed but not running"
        fi
    else
        log_info "Docker not installed (optional)"
    fi

    # Homebrew
    if command -v brew &> /dev/null; then
        log_pass "Homebrew" "Installed"
    else
        log_info "Homebrew not installed"
    fi
}
