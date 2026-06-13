#!/bin/bash
# Swap space management for low-memory servers

# Check if swap is enabled
check_swap() {
    local swap_total
    swap_total=$(free -m | awk '/^Swap:/{print $2}')

    if [ "$swap_total" -eq 0 ]; then
        return 1
    fi

    return 0
}

# Create swap file
create_swap() {
    local size_gb=${1:-2}
    local swapfile="/swapfile"

    log_info "开始创建 ${size_gb}GB swap 空间..."

    # Check if swapfile already exists
    if [ -f "$swapfile" ]; then
        log_warning "Swap 文件已存在: $swapfile"

        # Check if it's already enabled
        if swapon --show | grep -q "$swapfile"; then
            log_info "Swap 已启用，跳过创建"
            return 0
        else
            log_info "Swap 文件存在但未启用，尝试启用..."
            if sudo swapon "$swapfile" 2>/dev/null; then
                log_success "已启用现有 swap"
                return 0
            else
                log_warning "启用失败，将重新创建"
                sudo swapoff "$swapfile" 2>/dev/null
                sudo rm -f "$swapfile"
            fi
        fi
    fi

    # Create swap file
    log_info "分配 ${size_gb}GB 磁盘空间..."
    if ! sudo fallocate -l "${size_gb}G" "$swapfile"; then
        log_error "Swap 文件创建失败"
        return 1
    fi

    # Set permissions
    log_info "设置文件权限..."
    if ! sudo chmod 600 "$swapfile"; then
        log_error "权限设置失败"
        sudo rm -f "$swapfile"
        return 1
    fi

    # Make swap
    log_info "格式化为 swap..."
    if ! sudo mkswap "$swapfile" > /dev/null; then
        log_error "Swap 格式化失败"
        sudo rm -f "$swapfile"
        return 1
    fi

    # Enable swap
    log_info "启用 swap..."
    if ! sudo swapon "$swapfile"; then
        log_error "Swap 启用失败"
        sudo rm -f "$swapfile"
        return 1
    fi

    # Add to fstab for persistence
    if ! grep -q "$swapfile" /etc/fstab; then
        log_info "添加到 /etc/fstab 以持久化..."
        echo "$swapfile none swap sw 0 0" | sudo tee -a /etc/fstab > /dev/null
    fi

    # Verify
    if verify_swap; then
        log_success "Swap 创建并启用成功"
        return 0
    else
        log_error "Swap 验证失败"
        return 1
    fi
}

# Verify swap is working
verify_swap() {
    local swap_total
    swap_total=$(free -m | awk '/^Swap:/{print $2}')

    if [ "$swap_total" -eq 0 ]; then
        return 1
    fi

    log_info "Swap 状态:"
    free -h | grep -E '^(Mem|Swap):'
    return 0
}

# Remove swap file
remove_swap() {
    local swapfile="/swapfile"

    if [ ! -f "$swapfile" ]; then
        log_info "Swap 文件不存在"
        return 0
    fi

    log_info "禁用 swap..."
    sudo swapoff "$swapfile" 2>/dev/null

    log_info "删除 swap 文件..."
    sudo rm -f "$swapfile"

    log_info "从 /etc/fstab 移除..."
    sudo sed -i "\|$swapfile|d" /etc/fstab

    log_success "Swap 已移除"
    return 0
}
