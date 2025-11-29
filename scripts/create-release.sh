#!/bin/bash

# PrayerMap Release Helper Script
# This script helps create releases with proper versioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  PrayerMap Release Helper${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_git_status() {
    if [[ -n $(git status -s) ]]; then
        print_error "Working directory is not clean. Please commit or stash changes."
        git status -s
        exit 1
    fi
    print_success "Working directory is clean"
}

check_branch() {
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$CURRENT_BRANCH" != "main" ]]; then
        print_warning "You are on branch '$CURRENT_BRANCH', not 'main'"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "On main branch"
    fi
}

get_current_version() {
    CURRENT_VERSION=$(grep '"version":' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    echo "$CURRENT_VERSION"
}

get_last_tag() {
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    echo "$LAST_TAG"
}

analyze_commits() {
    LAST_TAG=$(get_last_tag)

    if [[ -z "$LAST_TAG" ]]; then
        print_info "No previous tags found. This will be the first release."
        COMMIT_RANGE="HEAD"
    else
        COMMIT_RANGE="${LAST_TAG}..HEAD"
        print_info "Analyzing commits since ${LAST_TAG}"
    fi

    BREAKING_CHANGES=$(git log $COMMIT_RANGE --grep="BREAKING CHANGE" --oneline | wc -l)
    FEATURES=$(git log $COMMIT_RANGE --grep="^feat" --oneline | wc -l)
    FIXES=$(git log $COMMIT_RANGE --grep="^fix" --oneline | wc -l)

    echo ""
    print_info "Commit analysis:"
    echo "  Breaking changes: $BREAKING_CHANGES"
    echo "  Features: $FEATURES"
    echo "  Fixes: $FIXES"
    echo ""
}

suggest_version() {
    CURRENT_VERSION=$(get_current_version)

    # Parse current version
    IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR="${VERSION_PARTS[0]}"
    MINOR="${VERSION_PARTS[1]}"
    PATCH="${VERSION_PARTS[2]%%[-+]*}"

    # Remove any prerelease suffix
    MAJOR="${MAJOR//[!0-9]/}"
    MINOR="${MINOR//[!0-9]/}"
    PATCH="${PATCH//[!0-9]/}"

    if [[ $BREAKING_CHANGES -gt 0 ]]; then
        SUGGESTED_VERSION="$((MAJOR + 1)).0.0"
        REASON="Breaking changes detected"
    elif [[ $FEATURES -gt 0 ]]; then
        SUGGESTED_VERSION="${MAJOR}.$((MINOR + 1)).0"
        REASON="New features detected"
    elif [[ $FIXES -gt 0 ]]; then
        SUGGESTED_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
        REASON="Bug fixes detected"
    else
        SUGGESTED_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
        REASON="Patch bump (no conventional commits found)"
    fi

    echo "$SUGGESTED_VERSION|$REASON"
}

run_tests() {
    print_info "Running tests..."

    if npm run test:ci > /dev/null 2>&1; then
        print_success "Tests passed"
    else
        print_error "Tests failed"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    if npm run lint > /dev/null 2>&1; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

create_tag() {
    VERSION=$1
    PRERELEASE=$2

    if [[ -n "$PRERELEASE" ]]; then
        TAG="v${VERSION}-${PRERELEASE}"
    else
        TAG="v${VERSION}"
    fi

    # Check if tag already exists
    if git rev-parse "$TAG" >/dev/null 2>&1; then
        print_error "Tag $TAG already exists"
        exit 1
    fi

    # Create tag
    git tag -a "$TAG" -m "Release $TAG"
    print_success "Created tag: $TAG"

    # Push tag
    read -p "Push tag to origin? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_warning "Tag created locally but not pushed"
        print_info "Push manually with: git push origin $TAG"
    else
        git push origin "$TAG"
        print_success "Pushed tag to origin"
        print_info "Release workflow will start automatically"
        print_info "Monitor at: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\).git/\1/')/actions"
    fi
}

# Main script
main() {
    print_header
    echo ""

    # Check git status
    check_git_status
    check_branch

    # Pull latest
    print_info "Pulling latest changes..."
    git pull origin $(git branch --show-current)
    print_success "Up to date with remote"
    echo ""

    # Analyze commits
    analyze_commits

    # Get current version
    CURRENT_VERSION=$(get_current_version)
    print_info "Current version: $CURRENT_VERSION"

    # Suggest version
    IFS='|' read -r SUGGESTED_VERSION REASON <<< "$(suggest_version)"
    print_info "Suggested version: $SUGGESTED_VERSION ($REASON)"
    echo ""

    # Ask for version
    echo "Release type:"
    echo "  1) Stable release (${SUGGESTED_VERSION})"
    echo "  2) Beta release (${SUGGESTED_VERSION}-beta.1)"
    echo "  3) Alpha release (${SUGGESTED_VERSION}-alpha.1)"
    echo "  4) Release candidate (${SUGGESTED_VERSION}-rc.1)"
    echo "  5) Custom version"
    echo "  6) Cancel"
    echo ""
    read -p "Select option (1-6): " -n 1 -r
    echo ""

    case $REPLY in
        1)
            VERSION=$SUGGESTED_VERSION
            PRERELEASE=""
            ;;
        2)
            VERSION=$SUGGESTED_VERSION
            PRERELEASE="beta.1"
            ;;
        3)
            VERSION=$SUGGESTED_VERSION
            PRERELEASE="alpha.1"
            ;;
        4)
            VERSION=$SUGGESTED_VERSION
            PRERELEASE="rc.1"
            ;;
        5)
            read -p "Enter version (e.g., 1.2.3 or 1.2.3-beta.1): " VERSION
            if [[ $VERSION =~ - ]]; then
                IFS='-' read -r VERSION PRERELEASE <<< "$VERSION"
            else
                PRERELEASE=""
            fi
            ;;
        6)
            print_info "Cancelled"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac

    # Confirm
    if [[ -n "$PRERELEASE" ]]; then
        FULL_VERSION="${VERSION}-${PRERELEASE}"
    else
        FULL_VERSION="$VERSION"
    fi

    echo ""
    print_info "Creating release: v$FULL_VERSION"
    read -p "Proceed? (Y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_info "Cancelled"
        exit 0
    fi

    # Run tests
    run_tests
    echo ""

    # Create tag
    create_tag "$VERSION" "$PRERELEASE"

    echo ""
    print_success "Release process started!"
    print_info "The GitHub Actions workflow will now:"
    echo "  • Build the application"
    echo "  • Run tests"
    echo "  • Generate changelog"
    echo "  • Create GitHub Release"
    echo "  • Update CHANGELOG.md"
    echo "  • Update package.json version"
    echo ""
    print_info "Next steps:"
    echo "  • Monitor the workflow in GitHub Actions"
    echo "  • Update iOS TestFlight (if needed)"
    echo "  • Update Android Play Console (if needed)"
    echo "  • Announce the release to the team"
}

# Run main
main
