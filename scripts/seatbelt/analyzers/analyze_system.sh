#!/bin/bash
# ============================================================================
# SEATBELT Analyzer: System & User Settings
# ============================================================================
# Analyzes local machine configuration and user development settings.
# Compatible with bash 3.2+ (macOS default)
# ============================================================================

# System stats
SYSTEM_STATS_os_version=""
SYSTEM_STATS_os_name=""
SYSTEM_STATS_arch=""
SYSTEM_STATS_cpu_cores=0
SYSTEM_STATS_memory_gb=0
SYSTEM_STATS_disk_free_gb=0
SYSTEM_STATS_shell=""
SYSTEM_STATS_terminal=""

# Development environment
DEV_ENV_node_version=""
DEV_ENV_npm_version=""
DEV_ENV_nvm_installed=false
DEV_ENV_homebrew_installed=false
DEV_ENV_git_version=""
DEV_ENV_docker_running=false

# User settings
USER_SETTINGS_git_name=""
USER_SETTINGS_git_email=""
USER_SETTINGS_default_branch=""
USER_SETTINGS_ssh_keys_count=0
USER_SETTINGS_gpg_configured=false
USER_SETTINGS_shell_config=""

# Score
CATEGORY_SCORES_system=0

analyze_system() {
    # Gather OS info
    gather_os_info

    # Gather hardware info
    gather_hardware_info

    # Gather development environment
    gather_dev_environment

    # Gather user settings
    gather_user_settings

    # Calculate system score
    calculate_system_score
}

gather_os_info() {
    # OS Name and Version
    if [[ "$(uname)" == "Darwin" ]]; then
        SYSTEM_STATS_os_name="macOS"
        SYSTEM_STATS_os_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")

        # Get macOS codename
        local major_version=$(echo "$SYSTEM_STATS_os_version" | cut -d. -f1)
        case $major_version in
            15) SYSTEM_STATS_os_codename="Sequoia" ;;
            14) SYSTEM_STATS_os_codename="Sonoma" ;;
            13) SYSTEM_STATS_os_codename="Ventura" ;;
            12) SYSTEM_STATS_os_codename="Monterey" ;;
            11) SYSTEM_STATS_os_codename="Big Sur" ;;
            *) SYSTEM_STATS_os_codename="" ;;
        esac
    else
        SYSTEM_STATS_os_name=$(uname -s)
        SYSTEM_STATS_os_version=$(uname -r)
        SYSTEM_STATS_os_codename=""
    fi

    # Architecture
    SYSTEM_STATS_arch=$(uname -m)

    # Shell
    SYSTEM_STATS_shell=$(basename "$SHELL")

    # Terminal
    if [[ -n "$TERM_PROGRAM" ]]; then
        SYSTEM_STATS_terminal="$TERM_PROGRAM"
    elif [[ -n "$TERMINAL_EMULATOR" ]]; then
        SYSTEM_STATS_terminal="$TERMINAL_EMULATOR"
    else
        SYSTEM_STATS_terminal="unknown"
    fi
}

gather_hardware_info() {
    # CPU cores
    if [[ "$(uname)" == "Darwin" ]]; then
        SYSTEM_STATS_cpu_cores=$(sysctl -n hw.ncpu 2>/dev/null || echo 0)

        # Memory in GB
        local mem_bytes=$(sysctl -n hw.memsize 2>/dev/null || echo 0)
        SYSTEM_STATS_memory_gb=$((mem_bytes / 1024 / 1024 / 1024))

        # Disk free space
        local disk_free=$(df -g / 2>/dev/null | tail -1 | awk '{print $4}')
        SYSTEM_STATS_disk_free_gb=${disk_free:-0}

        # Check if Apple Silicon
        if [[ "$SYSTEM_STATS_arch" == "arm64" ]]; then
            SYSTEM_STATS_chip_type="Apple Silicon"
        else
            SYSTEM_STATS_chip_type="Intel"
        fi
    else
        SYSTEM_STATS_cpu_cores=$(nproc 2>/dev/null || echo 0)
        local mem_kb=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
        SYSTEM_STATS_memory_gb=$((${mem_kb:-0} / 1024 / 1024))
        SYSTEM_STATS_disk_free_gb=$(df -BG / 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
        SYSTEM_STATS_chip_type="x86_64"
    fi
}

gather_dev_environment() {
    # Node.js
    if command -v node &> /dev/null; then
        DEV_ENV_node_version=$(node --version 2>/dev/null | tr -d 'v')
    fi

    # NPM
    if command -v npm &> /dev/null; then
        DEV_ENV_npm_version=$(npm --version 2>/dev/null)
    fi

    # NVM
    if [[ -d "$HOME/.nvm" ]] || command -v nvm &> /dev/null; then
        DEV_ENV_nvm_installed=true
    fi

    # Homebrew
    if command -v brew &> /dev/null; then
        DEV_ENV_homebrew_installed=true
        DEV_ENV_homebrew_packages=$(brew list 2>/dev/null | wc -l | tr -d ' ')
    fi

    # Git
    if command -v git &> /dev/null; then
        DEV_ENV_git_version=$(git --version 2>/dev/null | awk '{print $3}')
    fi

    # Docker
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            DEV_ENV_docker_running=true
        fi
    fi

    # Python
    if command -v python3 &> /dev/null; then
        DEV_ENV_python_version=$(python3 --version 2>/dev/null | awk '{print $2}')
    fi

    # Rust
    if command -v rustc &> /dev/null; then
        DEV_ENV_rust_version=$(rustc --version 2>/dev/null | awk '{print $2}')
    fi
}

gather_user_settings() {
    # Git user settings
    USER_SETTINGS_git_name=$(git config --global user.name 2>/dev/null || echo "")
    USER_SETTINGS_git_email=$(git config --global user.email 2>/dev/null || echo "")
    USER_SETTINGS_default_branch=$(git config --global init.defaultBranch 2>/dev/null || echo "master")

    # SSH keys
    if [[ -d "$HOME/.ssh" ]]; then
        USER_SETTINGS_ssh_keys_count=$(ls -1 "$HOME/.ssh"/*.pub 2>/dev/null | wc -l | tr -d ' ')
    fi

    # GPG
    if command -v gpg &> /dev/null; then
        local gpg_key=$(git config --global user.signingkey 2>/dev/null || echo "")
        if [[ -n "$gpg_key" ]]; then
            USER_SETTINGS_gpg_configured=true
        fi
    fi

    # Shell config file
    case "$SYSTEM_STATS_shell" in
        zsh)
            if [[ -f "$HOME/.zshrc" ]]; then
                USER_SETTINGS_shell_config=".zshrc"
            fi
            ;;
        bash)
            if [[ -f "$HOME/.bashrc" ]]; then
                USER_SETTINGS_shell_config=".bashrc"
            elif [[ -f "$HOME/.bash_profile" ]]; then
                USER_SETTINGS_shell_config=".bash_profile"
            fi
            ;;
    esac

    # Editor
    USER_SETTINGS_editor="${EDITOR:-${VISUAL:-not set}}"

    # Check for common dotfiles
    USER_SETTINGS_has_gitconfig=$([[ -f "$HOME/.gitconfig" ]] && echo true || echo false)
    USER_SETTINGS_has_npmrc=$([[ -f "$HOME/.npmrc" ]] && echo true || echo false)
    USER_SETTINGS_has_nvmrc=$([[ -f "$PROJECT_ROOT/.nvmrc" ]] && echo true || echo false)
}

calculate_system_score() {
    local score=100
    local deductions=0

    # Check minimum requirements

    # Memory: Penalize if < 8GB
    if [[ ${SYSTEM_STATS_memory_gb:-0} -lt 8 ]]; then
        deductions=$((deductions + 10))
    fi

    # Disk space: Penalize if < 10GB free
    if [[ ${SYSTEM_STATS_disk_free_gb:-0} -lt 10 ]]; then
        deductions=$((deductions + 15))
    fi

    # Git not configured
    if [[ -z "$USER_SETTINGS_git_name" || -z "$USER_SETTINGS_git_email" ]]; then
        deductions=$((deductions + 10))
    fi

    # No SSH keys
    if [[ ${USER_SETTINGS_ssh_keys_count:-0} -eq 0 ]]; then
        deductions=$((deductions + 5))
    fi

    # No NVM (Node version management)
    if [[ "$DEV_ENV_nvm_installed" != "true" ]]; then
        deductions=$((deductions + 5))
    fi

    # No .nvmrc in project
    if [[ "$USER_SETTINGS_has_nvmrc" != "true" ]]; then
        deductions=$((deductions + 5))
    fi

    score=$((score - deductions))
    [[ $score -lt 0 ]] && score=0

    CATEGORY_SCORES_system=$score
}

generate_system_recommendations() {
    # Low memory warning
    if [[ ${SYSTEM_STATS_memory_gb:-0} -lt 8 ]]; then
        add_optimization "MEDIUM" "System" \
            "Limited system memory" \
            "Only ${SYSTEM_STATS_memory_gb}GB RAM available. 8GB+ recommended for development." \
            "Close unused applications or consider upgrading hardware"
    fi

    # Low disk space
    if [[ ${SYSTEM_STATS_disk_free_gb:-0} -lt 10 ]]; then
        add_optimization "HIGH" "System" \
            "Low disk space" \
            "Only ${SYSTEM_STATS_disk_free_gb}GB free. May impact builds and node_modules." \
            "Free up disk space to prevent build failures"
    fi

    # No .nvmrc
    if [[ "$USER_SETTINGS_has_nvmrc" != "true" ]]; then
        add_optimization "LOW" "System" \
            "Pin Node.js version" \
            "No .nvmrc file found. Node version may vary between developers." \
            "Add .nvmrc with Node version to ensure consistency"
    fi

    # Docker not running
    if command -v docker &> /dev/null && [[ "$DEV_ENV_docker_running" != "true" ]]; then
        add_optimization "LOW" "System" \
            "Docker installed but not running" \
            "Docker is available but the daemon is not running." \
            "Start Docker if you need local database or containerized services"
    fi
}
