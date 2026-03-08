#!/bin/sh
# OverlayFS Manager - Read-Only Root Filesystem Utility
# Copyright (c) 2024 qutta1e30 <qutta1e30@gmail.com>
# SPDX-License-Identifier: MIT
# https://github.com/quetta-1030/overlayfs-manager

[ -f /scripts/config.sh ] && {
    . /scripts/config.sh
} || {
    . ./config.sh
}

usage() {
    cat <<EOF
Usage: $0 [install|reset|maintain|uninstall|status]
    install   : Install overlayfs to overlay partition
    reset     : Reset overlay to clean state
    maintain  : Toggle maintenance mode
                $0 maintain on  : Enable (writable)
                $0 maintain off : Disable (read-only)
    uninstall : Remove overlayfs completely
    status    : Show current status

Examples:
    sudo ovm install
    sudo ovm status
    sudo ovm reset
    sudo ovm maintain on
EOF
    exit 1
}

# Logging with colors
LOG() {
    case $1 in
        "GREEN")
            shift
            echo -e "\033[32;49;1m$1\033[39;49;0m"
            ;;
        "RED")
            shift
            echo -e "\033[31;49;1m$1\033[39;49;0m"
            ;;
        "BLUE")
            shift
            echo -e "\033[34;49;1m$1\033[39;49;0m"
            ;;
        *)
            echo "$1"
            ;;
    esac
}

# Get filesystem device info
common_get_fsys_and_dev() {
    local DEV_LBL=$1
    local FSYS_UUID DEV FSYS

    FSYS_UUID=$(cat /etc/fstab | grep -w "$DEV_LBL" | grep UUID)
    [ -z "$FSYS_UUID" ] && {
        FSYS=$(cat /etc/fstab | grep -w "$DEV_LBL" | awk -F ' ' '{print $1}' | sed 's/#//g')
        DEV=$FSYS
    } || {
        FSYS=$(cat /etc/fstab | grep "$DEV_LBL" | awk -F '=| ' '{print $2}')
        DEV=$(blkid | grep "$FSYS" | awk -F ':' '{print $1}')
    }

    echo $FSYS $DEV
}

logo_show() {
    cat <<"EOF"

#                     __
#   ___ _  _____ ____/ /__ ___ __
#  / _ \ |/ / -_) __/ / _ `/ // /
#  \___/___/\__/_/ /\_,_/\_, /
#                         /___/

EOF
    echo "# OverlayFS Manager (Version: $OYT_RV)"
    echo "# https://github.com/quetta-1030/overlayfs-manager"
    echo
}

do_install_check() {
    [ -f "/scripts/overlay.sh" ] && return 1 || return 0
}

do_maintain_check() {
    [ -f "$SCRIPTS/boot.sh.bak" ] && return 1 || return 0
}

do_notify_reboot() {
    read -n1 -p "Reboot now? [Y/N] " -t $CMD_TIMEOUT choose
    case $choose in
        Y|y)
            shutdown -r now
            ;;
        N|n)
            echo ""
            ;;
        *)
            shutdown -r now
            echo ""
            ;;
    esac
}

# Progress bar
CURRENT_PROGRESS=0
P_MARK_S=''
P_I=0
P_IDX=0
P_MARK_ARR=("|" "/" "-" "\\")

do_progress_init() {
    CURRENT_PROGRESS=0
    P_MARK_S=''
    P_I=0
    P_IDX=0
}

do_progress() {
    local PARAM_PROGRESS=$1
    local PARAM_PHASE=$2

    while [ $P_I -le $PARAM_PROGRESS ]; do
        [ $CURRENT_PROGRESS -le $P_I -a $PARAM_PROGRESS -ge $P_I ] && {
            P_IDX=$((P_I % 4))
            printf "[%-20s][%c] (%d%%) %-30s\r" "$P_MARK_S" "${P_MARK_ARR[$P_IDX]}" "$P_I" "$PARAM_PHASE"
            sleep 0.05
            [ $P_I -ge 100 ] && {
                do_progress_init
                printf "%-100s   \r\n" "Done!"
                return 0
            }
            P_I=$((P_I + 5))
            P_MARK_S='#'"$P_MARK_S"
        }
    done
    CURRENT_PROGRESS=$PARAM_PROGRESS
}

do_check_disk() {
    LOG GREEN "-------------------------------------------------"
    LOG GREEN "         Disk Overview"
    LOG GREEN "------------------------------------------------"
    LOG BLUE "[Root]"
    df -h / | awk 'NR==2 {printf "%-30s%s\n", $6, $2}'
    LOG BLUE "[Overlay]"
    df -h /overlay 2>/dev/null | awk 'NR==2 {printf "%-30s%s\n", $6, $2}' || echo "Not mounted"
    LOG GREEN "-------------------------------------------------"
    read -n1 -p "Press Enter to continue" -t $CMD_TIMEOUT input
    echo
}

do_os_check() {
    local os os_ver kernel_ver
    os=$(cat /etc/os-release | grep ^ID= | cut -d= -f2 | tr -d '"')

    case $os in
        centos|rhel|almalinux|rocky) ;;
        *)
            LOG RED "[Warning] OS '$os' may not be fully tested."
            ;;
    esac

    os_ver=$(cat /etc/redhat-release | sed -r 's/.* ([0-9]+)\..*/\1/')
    [ "$os_ver" -ne 7 ] && {
        LOG RED "[Warning] Tested on CentOS/RHEL 7. Your version: $os_ver"
    }

    kernel_ver=$(uname -r | awk -F[-.] '{print $4}')
    [ "$kernel_ver" -lt 690 ] && {
        LOG RED "[Error] Kernel too old ($kernel_ver). Requires 690+."
        LOG GREEN "Try: yum update kernel"
        exit 1
    }
}

do_fsck_setup() {
    local partdev=$1
    local order=${2:-1}
    local DEV NUM

    DEV=$(cat /etc/fstab | grep -w "$partdev" | awk -F ' ' '{print $1}' | sed 's/#//' | sed '/^$/d')
    [ -z "$DEV" ] || {
        NUM=$(grep -w "$DEV" /etc/fstab -n | cut -f1 -d:)
        sed -i "${NUM} s/.$/${order}/" /etc/fstab >/dev/null 2>&1
    }
}

overlay_status() {
    do_install_check
    [ $? -eq 0 ] && {
        LOG RED "[Status] Uninstalled"
        exit 0
    }

    do_maintain_check
    [ $? -eq 1 ] && {
        LOG BLUE "[Status] Maintaining"
        exit 0
    }

    LOG GREEN "[Status] Installed"
    exit 0
}

overlay_install() {
    do_install_check
    [ $? -eq 1 ] && {
        LOG GREEN "[Status] Already installed"
        exit 0
    }

    do_os_check
    do_check_disk

    local retval=$(common_get_fsys_and_dev "$OVERLAY_ROOT")
    local device=$(echo "$retval" | awk '{print $2}')

    LOG BLUE "Installing to $device"

    do_progress 20 "Installing dependencies"
    if ! grep -q overlay /proc/filesystems; then
        yum install -y packages/fuse3-libs-*.rpm >/dev/null 2>&1
        yum install -y packages/fuse-overlayfs-*.rpm >/dev/null 2>&1
        echo overlay > /etc/modules-load.d/overlay.conf
        depmod
    fi

    do_progress 50 "Creating overlay directories"
    mkdir -p "$SCRIPTS"
    umount "$device" >/dev/null 2>&1
    mount "$device" "$OVERLAY_ROOT"
    [ $? -ne 0 ] && {
        LOG RED "Cannot mount $device"
        exit 1
    }

    do_progress 70 "Setting up overlay structure"
    [ -z "$OVERLAY_DIR_CONFIG" ] || {
        for dir in $OVERLAY_DIR_CONFIG; do
            mkdir -p "${OVERLAY_ROOT}/.${dir#1}/upper"
            mkdir -p "${OVERLAY_ROOT}/.${dir#1}/work"
        done
    }

    do_progress 80 "Configuring fsck"
    [ -z "$FSCK_CONFIG" ] || {
        for dev in $FSCK_CONFIG; do
            do_fsck_setup "$dev" 1
        done
    }

    do_progress 90 "Installing scripts"
    cp boot.sh "$SCRIPTS"
    cp service/boot.service /lib/systemd/system/
    ln -sf /lib/systemd/system/boot.service /lib/systemd/system/sysinit.target.wants/
    cp service/readonly.service /lib/systemd/system/
    ln -sf /lib/systemd/system/readonly.service /lib/systemd/system/sysinit.target.wants/

    cp overlay.sh "$SCRIPTS"
    cp config.sh "$SCRIPTS"
    chown -R root:root "$SCRIPTS/"
    chmod 750 "$SCRIPTS"/*
    ln -sf "$SCRIPTS/overlay.sh" /usr/bin/ovm >/dev/null 2>&1

    do_progress 100 "Installation complete"
    LOG GREEN "Please reboot to activate overlay."
    do_notify_reboot
}

overlay_reset() {
    do_install_check
    [ $? -eq 0 ] && {
        LOG RED "Not installed"
        exit 0
    }

    [ -z "$OVERLAY_DIR_CONFIG" ] || {
        for dir in $OVERLAY_DIR_CONFIG; do
            rm -rf "${OVERLAY_ROOT}/.${dir#1}/upper"/*
        done
    }

    LOG GREEN "Overlay reset complete."
}

overlay_maintain() {
    do_install_check
    [ $? -eq 0 ] && {
        LOG RED "Not installed"
        exit 0
    }

    local enable="$1"
    [ -z "$enable" ] && usage
    [ "$enable" != "on" -a "$enable" != "off" ] && usage

    if [ "$enable" = "on" ]; then
        mount -o rw,remount /
        [ -z "$APP_DEV_CONFIG" ] || {
            for appmtp in $APP_DEV_CONFIG; do
                mount -o rw,remount "/$appmtp" >/dev/null 2>&1
            done
        }
        mv "$SCRIPTS/boot.sh" "$SCRIPTS/boot.sh.bak" >/dev/null 2>&1
        sync
        LOG RED "Reboot to writable mode."
        do_notify_reboot
    else
        mv "$SCRIPTS/boot.sh.bak" "$SCRIPTS/boot.sh" >/dev/null
        sync
        LOG RED "Reboot to read-only mode."
        do_notify_reboot
    fi
}

overlay_uninstall() {
    do_install_check
    [ $? -eq 0 ] && {
        LOG RED "Not installed"
        exit 0
    }

    do_maintain_check
    [ $? -eq 0 ] && {
        LOG RED "Disable maintenance mode first"
        exit 0
    }

    do_progress 50 "Removing services"
    rm -f /lib/systemd/system/boot.service
    rm -f /lib/systemd/system/sysinit.target.wants/boot.service
    rm -f /lib/systemd/system/readonly.service
    rm -f /lib/systemd/system/sysinit.target.wants/readonly.service

    do_progress 80 "Removing overlay directories"
    rm -rf "${OVERLAY_ROOT}"/.*

    do_progress 100 "Removing scripts"
    rm -rf "$SCRIPTS"
    rm -f /usr/bin/ovm

    LOG GREEN "Uninstall complete."
}

logo_show

case "$1" in
    install)   overlay_install ;;
    reset)     overlay_reset ;;
    maintain)  overlay_maintain "$2" ;;
    uninstall) overlay_uninstall ;;
    status)    overlay_status ;;
    *)         usage ;;
esac
