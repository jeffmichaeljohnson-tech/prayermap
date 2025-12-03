#!/bin/bash
# ============================================================================
# 📦 SEATBELT Module: Git State Checks
# ============================================================================
# Validates git repository state and remote connectivity.
# ============================================================================

check_git() {
    cd "$PROJECT_ROOT" || return

    # Check if git repo
    if [[ ! -d ".git" ]]; then
        log_fail "Git Repo" "Not a git repository"
        return
    fi

    log_pass "Git Repo" "Repository initialized"

    # Current branch
    local current_branch=$(git branch --show-current 2>/dev/null)
    if [[ -n "$current_branch" ]]; then
        log_pass "Git Branch" "On branch: $current_branch"
    else
        log_warn "Git Branch" "Detached HEAD state"
    fi

    # Check for uncommitted changes
    local uncommitted=$(git status --porcelain 2>/dev/null)
    if [[ -z "$uncommitted" ]]; then
        log_pass "Git Status" "Working tree clean"
    else
        local file_count=$(echo "$uncommitted" | wc -l | tr -d ' ')
        log_warn "Git Status" "$file_count uncommitted changes"

        if [[ "$VERBOSE" == true ]]; then
            echo "$uncommitted" | head -10
        fi
    fi

    # Check if ahead/behind remote
    git fetch --quiet 2>/dev/null || true

    local ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
    local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")

    if [[ "$ahead" -gt 0 ]]; then
        log_warn "Git Push" "$ahead commits ahead of remote - remember to push"
    fi

    if [[ "$behind" -gt 0 ]]; then
        log_warn "Git Pull" "$behind commits behind remote - consider pulling"
    fi

    if [[ "$ahead" -eq 0 && "$behind" -eq 0 ]]; then
        log_pass "Git Sync" "Up to date with remote"
    fi

    # Check remote URL
    local remote_url=$(git remote get-url origin 2>/dev/null)
    if [[ -n "$remote_url" ]]; then
        if [[ "$remote_url" == *"github.com"* ]]; then
            log_pass "Git Remote" "GitHub: $remote_url"
        else
            log_pass "Git Remote" "$remote_url"
        fi
    else
        log_warn "Git Remote" "No remote 'origin' configured"
    fi

    # Check for .nvmrc
    if [[ -f "$PROJECT_ROOT/.nvmrc" ]]; then
        local nvmrc_version=$(cat "$PROJECT_ROOT/.nvmrc")
        log_pass "Node Version" "Pinned to $nvmrc_version via .nvmrc"
    else
        log_warn "Node Version" "No .nvmrc file - Node version not pinned"
    fi

    # Recent commits
    if [[ "$VERBOSE" == true ]]; then
        log_info "Recent commits:"
        git log --oneline -5 2>/dev/null
    fi

    cd - > /dev/null
}
