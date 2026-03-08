#!/bin/sh
# OverlayFS Manager - Configuration File
# Copyright (c) 2024 qutta1e30 <qutta1e30@gmail.com>
# SPDX-License-Identifier: MIT
# https://github.com/quetta-1030/overlayfs-manager

# =============================================================================
# User Configuration Section
# =============================================================================

# Additional device mount points (space-separated)
# Example: /data /app /storage
APP_DEV_CONFIG=""

# overlay mount directorys list,the directory will overlay the real directory
OVERLAY_DIR_CONFIG="/etc /var /tmp /usr/local $APP_DEV_CONFIG"

# overlay clear directorys list when start up
CLEAR_DIR_CONFIG="/tmp /var/log /var/crash /var/cache"

# fsck parition list when start up,will modify /etd/fstab
FSCK_CONFIG="/boot /overlay"

# =============================================================================
# System Configuration (typically no need to modify)
# =============================================================================

# script install directory
SCRIPTS=/scripts

# Overlay mount directory
OVERLAY_NAME=overlay
OVERLAY_ROOT=/$OVERLAY_NAME

# Command timeout (seconds)
CMD_TIMEOUT=10

# Command
MOUNT_CMD=/bin/mount

# Release Version
OYT_RV="1.0.0"
