/**
 * OverlayFS Manager - Node.js API
 * Copyright (c) 2024 OverlayFS Manager Contributors
 *
 * SPDX-License-Identifier: MIT
 */

const shell = require('shelljs');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = '/scripts';
const OVERLAY_ROOT = '/overlay';

class OverlayFSManager {
    constructor() {
        this.scriptsDir = SCRIPTS_DIR;
        this.overlayRoot = OVERLAY_ROOT;
    }

    /**
     * Check if running as root
     */
    checkRoot() {
        return process.getuid() === 0;
    }

    /**
     * Get current installation status
     * @returns {Promise<string>} 'installed' | 'uninstalled' | 'maintaining'
     */
    async getStatus() {
        const overlayScript = path.join(this.scriptsDir, 'overlay.sh');
        const bootBackup = path.join(this.scriptsDir, 'boot.sh.bak');

        if (!shell.test('-f', overlayScript)) {
            return 'uninstalled';
        } else if (shell.test('-f', bootBackup)) {
            return 'maintaining';
        } else {
            return 'installed';
        }
    }

    /**
     * Install OverlayFS Manager
     * @param {Object} options - Installation options
     * @returns {Promise<Object>} Installation result
     */
    async install(options = {}) {
        if (!this.checkRoot()) {
            throw new Error('Root privileges required');
        }

        const result = { success: true, errors: [], warnings: [] };

        // OS check
        const osCheck = shell.exec('cat /etc/os-release | grep -i ID=', { silent: true });
        const os = osCheck.stdout.toLowerCase();
        if (!os.includes('centos') && !os.includes('rhel') && !os.includes('almalinux')) {
            result.warnings.push('OS may not be fully supported');
        }

        // Kernel check
        const kernelVer = parseInt(shell.exec('uname -r | awk -F[-.] \'{print $4}\'', { silent: true }).stdout.trim());
        if (kernelVer < 690) {
            throw new Error(`Kernel version too old (${kernelVer}). Requires 690+`);
        }

        // Install dependencies
        const pkgDir = path.join(__dirname, '../packages');
        if (shell.test('-d', pkgDir)) {
            shell.exec(`yum install -y ${pkgDir}/fuse3-libs-*.rpm`, { silent: true });
            shell.exec(`yum install -y ${pkgDir}/fuse-overlayfs-*.rpm`, { silent: true });
        }

        // Load kernel module
        shell.mkdir('-p', '/etc/modules-load.d');
        shell.exec('echo overlay > /etc/modules-load.d/overlay.conf', { silent: true });
        shell.exec('depmod', { silent: true });

        // Copy scripts
        shell.mkdir('-p', this.scriptsDir);
        shell.cp(path.join(__dirname, '../scripts/boot.sh'), this.scriptsDir);
        shell.cp(path.join(__dirname, '../scripts/overlay.sh'), this.scriptsDir);
        shell.cp(path.join(__dirname, '../scripts/config.sh'), this.scriptsDir);
        shell.cp('-r', path.join(__dirname, '../scripts/service'), '/lib/systemd/system/');

        // Enable services
        shell.ln('-sf', '/lib/systemd/system/boot.service', '/lib/systemd/system/sysinit.target.wants/');
        shell.ln('-sf', '/lib/systemd/system/readonly.service', '/lib/systemd/system/sysinit.target.wants/');

        // Create symlink
        shell.ln('-sf', path.join(this.scriptsDir, 'overlay.sh'), '/usr/bin/ovm');

        // Set permissions
        shell.chmod('-R', '750', this.scriptsDir);
        shell.chown('-R', 'root:root', this.scriptsDir);

        return result;
    }

    /**
     * Reset overlay to factory state
     * @returns {Promise<Object>} Reset result
     */
    async reset() {
        if (!this.checkRoot()) {
            throw new Error('Root privileges required');
        }

        const status = await this.getStatus();
        if (status !== 'installed') {
            throw new Error('OverlayFS Manager not installed');
        }

        // Read config
        const configContent = shell.cat(path.join(this.scriptsDir, 'config.sh')).stdout;
        const match = configContent.match(/OVERLAY_DIR_CONFIG="([^"]+)"/);

        if (match) {
            const dirs = match[1].split(' ');
            for (const dir of dirs) {
                const upperDir = path.join(this.overlayRoot, `.${dir.replace(/^\//, '')}/upper`);
                if (shell.test('-d', upperDir)) {
                    shell.rm('-rf', `${upperDir}/*`);
                }
            }
        }

        return { success: true, message: 'Overlay reset complete' };
    }

    /**
     * Toggle maintenance mode
     * @param {boolean} enable - Enable or disable maintenance mode
     * @returns {Promise<Object>} Result
     */
    async setMaintenanceMode(enable) {
        if (!this.checkRoot()) {
            throw new Error('Root privileges required');
        }

        const status = await this.getStatus();
        if (status === 'uninstalled') {
            throw new Error('OverlayFS Manager not installed');
        }

        if (enable) {
            shell.mv(
                path.join(this.scriptsDir, 'boot.sh'),
                path.join(this.scriptsDir, 'boot.sh.bak')
            );
            return { success: true, message: 'Maintenance mode enabled' };
        } else {
            shell.mv(
                path.join(this.scriptsDir, 'boot.sh.bak'),
                path.join(this.scriptsDir, 'boot.sh')
            );
            return { success: true, message: 'Maintenance mode disabled' };
        }
    }

    /**
     * Uninstall OverlayFS Manager
     * @returns {Promise<Object>} Uninstall result
     */
    async uninstall() {
        if (!this.checkRoot()) {
            throw new Error('Root privileges required');
        }

        // Remove services
        shell.rm('-f', '/lib/systemd/system/boot.service');
        shell.rm('-f', '/lib/systemd/system/sysinit.target.wants/boot.service');
        shell.rm('-f', '/lib/systemd/system/readonly.service');
        shell.rm('-f', '/lib/systemd/system/sysinit.target.wants/readonly.service');

        // Remove overlay directories
        const configContent = shell.cat(path.join(this.scriptsDir, 'config.sh')).stdout;
        const match = configContent.match(/OVERLAY_DIR_CONFIG="([^"]+)"/);
        if (match) {
            const dirs = match[1].split(' ');
            for (const dir of dirs) {
                shell.rm('-rf', path.join(this.overlayRoot, `.${dir.replace(/^\//, '')}`));
            }
        }

        // Remove scripts
        shell.rm('-rf', this.scriptsDir);
        shell.rm('-f', '/usr/bin/ovm');

        return { success: true, message: 'Uninstall complete' };
    }
}

module.exports = OverlayFSManager;
