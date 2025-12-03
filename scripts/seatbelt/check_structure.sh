#!/bin/bash
# ============================================================================
# 📁 SEATBELT Module: Project Structure Checks
# ============================================================================
# Validates project structure and critical files exist.
# ============================================================================

check_structure() {
    # Source directories
    local required_dirs=(
        "src"
        "src/components"
        "src/hooks"
        "src/lib"
        "docs"
    )

    for dir in "${required_dirs[@]}"; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            log_pass "Directory" "$dir/"
        else
            log_warn "Directory" "$dir/ not found"
        fi
    done

    # Critical documentation files
    local critical_docs=(
        "docs/CLAUDE.md"
        "docs/PRD.md"
        "docs/RULES.md"
        "docs/ARTICLE.md"
        "docs/LIVING-MAP-PRINCIPLE.md"
    )

    for doc in "${critical_docs[@]}"; do
        if [[ -f "$PROJECT_ROOT/$doc" ]]; then
            log_pass "Documentation" "$doc"
        else
            log_warn "Documentation" "$doc not found"
        fi
    done

    # Claude Code project config
    local claude_project_dir="$PROJECT_ROOT/.claude"
    if [[ -d "$claude_project_dir" ]]; then
        if [[ -f "$claude_project_dir/settings.local.json" ]]; then
            log_pass "Claude Code" "Project settings configured"
        else
            log_warn "Claude Code" ".claude/ exists but settings.local.json missing"
        fi
    else
        log_warn "Claude Code" ".claude/ directory not found"
    fi

    # Supabase migrations
    local migrations_dir="$PROJECT_ROOT/supabase/migrations"
    if [[ -d "$migrations_dir" ]]; then
        local migration_count=$(ls -1 "$migrations_dir"/*.sql 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$migration_count" -gt 0 ]]; then
            log_pass "Migrations" "$migration_count SQL migration files"
        else
            log_warn "Migrations" "Directory exists but no .sql files"
        fi
    else
        log_warn "Migrations" "supabase/migrations/ not found"
    fi

    # GitHub workflows
    local workflows_dir="$PROJECT_ROOT/.github/workflows"
    if [[ -d "$workflows_dir" ]]; then
        local workflow_count=$(ls -1 "$workflows_dir"/*.yml 2>/dev/null | wc -l | tr -d ' ')
        log_pass "GitHub Actions" "$workflow_count workflow files"
    else
        log_info "GitHub Actions: No .github/workflows/ directory (CI/CD not configured)"
    fi

    # Mobile directories (Capacitor)
    if [[ -d "$PROJECT_ROOT/ios" ]]; then
        log_pass "iOS" "ios/ directory exists"
    else
        log_info "iOS: ios/ not found"
    fi

    if [[ -d "$PROJECT_ROOT/android" ]]; then
        log_pass "Android" "android/ directory exists"
    else
        log_info "Android: android/ not found"
    fi

    # Build output
    if [[ -d "$PROJECT_ROOT/dist" ]]; then
        local dist_size=$(du -sh "$PROJECT_ROOT/dist" 2>/dev/null | cut -f1)
        log_pass "Build Output" "dist/ exists ($dist_size)"
    else
        log_info "Build Output: dist/ not found (run npm run build)"
    fi
}
