#!/bin/bash
# ============================================================================
# 🔐 SEATBELT Module: Authentication Checks
# ============================================================================
# Verifies all CLI tools are authenticated and ready to use.
# ============================================================================

check_auth() {
    # GitHub CLI
    if command -v gh &> /dev/null; then
        if gh auth status &> /dev/null; then
            local gh_user=$(gh auth status 2>&1 | grep "Logged in to" | head -1)
            log_pass "GitHub CLI" "Authenticated - $gh_user"
        else
            log_fail "GitHub CLI" "Not authenticated. Run: gh auth login"
        fi
    else
        log_warn "GitHub CLI" "Not installed. Run: brew install gh"
    fi

    # Supabase CLI
    if command -v supabase &> /dev/null; then
        # Check if project is linked (more reliable than auth check)
        if [[ -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]]; then
            local project_ref=$(cat "$PROJECT_ROOT/supabase/.temp/project-ref")
            log_pass "Supabase CLI" "Linked to project: $project_ref"
        elif supabase projects list 2>&1 | grep -q "ACTIVE"; then
            log_pass "Supabase CLI" "Authenticated"
        else
            log_fail "Supabase CLI" "Not authenticated. Run: supabase login"
        fi
    else
        log_warn "Supabase CLI" "Not installed. Run: brew install supabase/tap/supabase"
    fi

    # Vercel CLI
    if command -v vercel &> /dev/null; then
        local vercel_user=$(vercel whoami 2>/dev/null)
        if [[ -n "$vercel_user" ]]; then
            log_pass "Vercel CLI" "Authenticated as $vercel_user"
        elif [[ -f "$PROJECT_ROOT/.vercel/project.json" ]]; then
            # Project is linked, auth may work via MCP
            local project_name=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/.vercel/project.json')).get('projectName', 'unknown'))" 2>/dev/null)
            log_warn "Vercel CLI" "Project linked ($project_name) but CLI not authenticated. Run: vercel login"
        else
            log_fail "Vercel CLI" "Not authenticated. Run: vercel login"
        fi
    else
        log_warn "Vercel CLI" "Not installed. Run: npm i -g vercel"
    fi

    # AWS CLI
    if command -v aws &> /dev/null; then
        if aws sts get-caller-identity &> /dev/null 2>&1; then
            local aws_account=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
            log_pass "AWS CLI" "Authenticated - Account: $aws_account"
        else
            log_warn "AWS CLI" "Not authenticated or credentials expired"
        fi
    else
        log_info "AWS CLI not installed (optional)"
    fi

    # Git SSH
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        log_pass "Git SSH" "SSH key authenticated with GitHub"
    else
        # Check if SSH key exists
        if [[ -f "$HOME/.ssh/id_ed25519" ]] || [[ -f "$HOME/.ssh/id_rsa" ]]; then
            log_warn "Git SSH" "SSH key exists but may not be added to GitHub"
        else
            log_warn "Git SSH" "No SSH key found. Run: ssh-keygen -t ed25519"
        fi
    fi

    # Git push dry-run
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        cd "$PROJECT_ROOT"
        if git push --dry-run &> /dev/null 2>&1; then
            log_pass "Git Push" "Push access verified"
        else
            log_warn "Git Push" "Push may fail - check remote and credentials"
        fi
        cd - > /dev/null
    fi
}
