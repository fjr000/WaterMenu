#!/bin/bash
# Pre-deployment environment checks for low-spec servers

# Check available memory (in MB)
check_memory() {
    local available_mem
    available_mem=$(free -m | awk '/^Mem:/{print $7}')

    log_info "可用内存: ${available_mem}MB"

    if [ "$available_mem" -lt 1500 ]; then
        log_warning "可用内存不足 1500MB (当前: ${available_mem}MB)"
        return 1
    fi

    log_success "内存检查通过"
    return 0
}

# Check swap status
check_swap_status() {
    local swap_total
    swap_total=$(free -m | awk '/^Swap:/{print $2}')

    if [ "$swap_total" -eq 0 ]; then
        log_warning "未启用 swap 空间"
        return 1
    fi

    log_success "Swap 已启用: ${swap_total}MB"
    return 0
}

# Check disk space (minimum 10GB)
check_disk_space() {
    local available_disk
    available_disk=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')

    log_info "可用磁盘空间: ${available_disk}GB"

    if [ "$available_disk" -lt 10 ]; then
        log_error "磁盘空间不足 10GB (当前: ${available_disk}GB)"
        return 1
    fi

    log_success "磁盘空间检查通过"
    return 0
}

# Check Docker version
check_docker_version() {
    local docker_version
    docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null)

    if [ -z "$docker_version" ]; then
        log_error "无法获取 Docker 版本"
        return 1
    fi

    log_info "Docker 版本: ${docker_version}"

    # Check minimum version 20.10
    local major minor
    major=$(echo "$docker_version" | cut -d. -f1)
    minor=$(echo "$docker_version" | cut -d. -f2)

    if [ "$major" -lt 20 ] || { [ "$major" -eq 20 ] && [ "$minor" -lt 10 ]; }; then
        log_warning "Docker 版本过低，建议 >= 20.10"
        return 1
    fi

    log_success "Docker 版本检查通过"
    return 0
}

# Check port availability
check_ports() {
    local ports=("8080" "8443")
    local failed=0

    for port in "${ports[@]}"; do
        if ss -tuln | grep -q ":${port} "; then
            log_warning "端口 ${port} 已被占用"
            failed=1
        else
            log_info "端口 ${port} 可用"
        fi
    done

    if [ $failed -eq 1 ]; then
        return 1
    fi

    log_success "端口检查通过"
    return 0
}

# Run all pre-checks
run_pre_checks() {
    local failed=0

    log_info "=== 部署前环境检查 ==="
    echo ""

    # Check disk space
    if ! check_disk_space; then
        log_error "磁盘空间检查失败，请释放磁盘空间"
        failed=1
    fi

    # Check Docker version
    if ! check_docker_version; then
        log_warning "Docker 版本检查失败，但可以继续"
    fi

    # Check ports
    if ! check_ports; then
        log_error "端口检查失败，请释放被占用的端口或修改配置"
        log_info "检查端口占用: sudo ss -tulnp | grep -E ':(8080|8443)'"
        failed=1
    fi

    # Check memory (critical for low-spec servers)
    echo ""
    log_info "=== 内存和 Swap 检查 ==="

    local memory_ok=0
    local swap_ok=0

    if check_memory; then
        memory_ok=1
    fi

    if check_swap_status; then
        swap_ok=1
    fi

    # If memory < 1500MB and no swap, require swap
    if [ $memory_ok -eq 0 ] && [ $swap_ok -eq 0 ]; then
        echo ""
        log_error "检测到低内存环境且未启用 swap，部署可能失败"
        log_warning "强烈建议创建 swap 空间以避免 OOM"
        echo ""
        echo "是否自动创建 2GB swap 空间？(y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            if create_swap 2; then
                log_success "Swap 创建成功"
                swap_ok=1
            else
                log_error "Swap 创建失败"
                failed=1
            fi
        else
            log_warning "跳过 swap 创建，部署风险较高"
            echo ""
            echo "手动创建 swap 命令："
            echo "  sudo fallocate -l 2G /swapfile"
            echo "  sudo chmod 600 /swapfile"
            echo "  sudo mkswap /swapfile"
            echo "  sudo swapon /swapfile"
            echo "  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab"
            echo ""
            echo "是否继续部署？(y/n)"
            read -r continue_response
            if [[ ! "$continue_response" =~ ^[Yy]$ ]]; then
                log_error "部署已取消"
                exit 1
            fi
        fi
    elif [ $memory_ok -eq 0 ] && [ $swap_ok -eq 1 ]; then
        log_info "内存不足但 swap 已启用，可以继续部署"
    fi

    echo ""
    if [ $failed -eq 1 ]; then
        log_error "预检查失败，请修复上述问题后重试"
        return 1
    fi

    log_success "预检查全部通过"
    return 0
}
