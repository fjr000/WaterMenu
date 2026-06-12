#!/bin/bash
# Health check utilities for deployment validation

# Source logger
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/logger.sh
source "${SCRIPT_DIR}/logger.sh"

# Health check configuration
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-3}"
HEALTH_CHECK_DELAY="${HEALTH_CHECK_DELAY:-5}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"

# Check if all containers are running
check_containers() {
    log_info "Checking container status..."

    # Get container status
    local status_output
    status_output=$(docker compose -f docker-compose.prod.yml ps --format json 2>&1)
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        log_error "Failed to get container status"
        return 1
    fi

    # Check if all required services are running
    local required_services=("postgres" "backend" "nginx")
    local all_running=true

    for service in "${required_services[@]}"; do
        local service_state
        # Parse line-delimited JSON
        service_state=$(echo "$status_output" | jq -r "select(.Service == \"$service\") | .State" 2>/dev/null | head -n1)

        if [ -z "$service_state" ]; then
            log_error "Service ${service} not found"
            all_running=false
        elif [ "$service_state" != "running" ]; then
            log_error "Service ${service} is not running (state: ${service_state})"
            all_running=false
        else
            log_success "Service ${service} is running"
        fi
    done

    if [ "$all_running" = false ]; then
        return 1
    fi

    return 0
}

# Check API health endpoint
check_api_health() {
    local port="${1:-8080}"
    log_info "Checking API health endpoint..."

    local url="http://localhost:${port}/api/health"
    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" --max-time 10 "$url" 2>&1)
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" != "200" ]; then
        log_error "API health check failed (HTTP ${http_code})"
        return 1
    fi

    log_success "API health check passed"
    return 0
}

# Check database connectivity via backend container
check_database() {
    log_info "Checking database connectivity..."

    # Try to connect to database via backend container using Prisma
    local result
    result=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "npx prisma db execute --stdin <<< 'SELECT 1'" 2>&1)
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        log_error "Database connectivity check failed"
        return 1
    fi

    log_success "Database connectivity check passed"
    return 0
}

# Run all health checks with retry logic
run_health_checks() {
    local port="${1:-8080}"
    local attempt=1
    local start_time
    start_time=$(date +%s)

    log_info "Starting health checks (${HEALTH_CHECK_RETRIES} attempts, ${HEALTH_CHECK_DELAY}s delay, ${HEALTH_CHECK_TIMEOUT}s timeout)"

    while [ $attempt -le "$HEALTH_CHECK_RETRIES" ]; do
        # Check if we've exceeded the overall timeout
        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge "$HEALTH_CHECK_TIMEOUT" ]; then
            log_error "Health checks timed out after ${elapsed}s"
            return 1
        fi

        log_info "Health check attempt ${attempt}/${HEALTH_CHECK_RETRIES}"

        # Run checks
        if check_containers && check_api_health "$port"; then
            log_success "All health checks passed"
            return 0
        fi

        # If not last attempt, wait and retry
        if [ $attempt -lt "$HEALTH_CHECK_RETRIES" ]; then
            log_warning "Health checks failed, retrying in ${HEALTH_CHECK_DELAY}s..."
            sleep "$HEALTH_CHECK_DELAY"
        fi

        attempt=$((attempt + 1))
    done

    log_error "Health checks failed after ${HEALTH_CHECK_RETRIES} attempts"
    return 1
}
