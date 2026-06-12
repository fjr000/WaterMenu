#!/bin/bash
# Logging utilities for deployment scripts

# Colors
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

# Log file path (set by caller)
LOG_FILE="${LOG_FILE:-}"

# Log with timestamp
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Format: [YYYY-MM-DD HH:MM:SS] [LEVEL] message
    local log_entry="[${timestamp}] [${level}] ${message}"

    # Write to log file if set
    if [ -n "$LOG_FILE" ]; then
        echo "$log_entry" >> "$LOG_FILE"
    fi

    # Also output to terminal with colors
    case "$level" in
        INFO)
            echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $message"
            ;;
        SUCCESS)
            echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $message"
            ;;
        WARNING)
            echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} $message"
            ;;
        ERROR)
            echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $message"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

log_info() {
    log "INFO" "$@"
}

log_success() {
    log "SUCCESS" "$@"
}

log_warning() {
    log "WARNING" "$@"
}

log_error() {
    log "ERROR" "$@"
}

# Initialize log file
init_log() {
    local log_dir="deploy/logs"
    mkdir -p "$log_dir"

    # Create log file with timestamp
    local timestamp
    timestamp=$(date '+%Y%m%d-%H%M%S')
    LOG_FILE="${log_dir}/deployment-${timestamp}.log"

    # Export for use in other scripts
    export LOG_FILE

    log_info "=== WaterMenu Deployment Started ==="
    log_info "Log file: ${LOG_FILE}"
}

# Cleanup old logs (keep last N)
cleanup_old_logs() {
    local keep_count="${1:-30}"
    local log_dir="deploy/logs"

    if [ ! -d "$log_dir" ]; then
        return
    fi

    # Count log files
    local log_count
    log_count=$(find "$log_dir" -name "deployment-*.log" | wc -l)

    if [ "$log_count" -le "$keep_count" ]; then
        return
    fi

    # Remove oldest logs
    log_info "Cleaning up old deployment logs (keeping last ${keep_count})"
    find "$log_dir" -name "deployment-*.log" -type f | sort | head -n -"$keep_count" | xargs rm -f
}
