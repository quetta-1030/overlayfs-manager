#!/bin/sh
# OverlayFS Manager - Boot Script
# Executed by systemd boot.service during system startup
# Copyright (C) 2024 OverlayFS Manager Contributors
# https://github.com/quetta-1030/overlayfs-manager

. /scripts/config.sh


# For read-only root service
[ "$1" = "ro_root" ] && {
   $MOUNT_CMD -o ro,remount /

} || {
	[ ! -d $OVERLAY ] && exit 0

	# Remount additional partitions as read-only
	[ -z "$APP_DEV_CONFIG" ] || {
	    for appmtp in $APP_DEV_CONFIG
	    do
			$MOUNT_CMD -o ro,remount /$appmtp >/dev/null 2>&1
	    done
	}

	[ -z "$OVERLAY_DIR_CONFIG" ] || {
		for dir in $OVERLAY_DIR_CONFIG
		do
		     $MOUNT_CMD -t overlay $dir -o lowerdir=$dir,upperdir=${OVERLAY_ROOT}/.${dir:1}/upper,workdir=${OVERLAY_ROOT}/.${dir:1}/work $dir
		done
	}

	[ -z "$CLEAR_DIR_CONFIG" ] || {
	    for dir in $CLEAR_DIR_CONFIG
	    do
			[ -f ${dir} ] && rm -f ${dir} >/dev/null 2>&1
			[ -d ${dir} ] && rm -rf ${dir}/* >/dev/null 2>&1
	    done
	}
}
