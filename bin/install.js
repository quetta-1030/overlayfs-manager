#!/usr/bin/env node

/**
 * OverlayFS Manager - Interactive Install Script
 * Copyright (C) 2024 OverlayFS Manager Contributors
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = '/scripts';
const OVERLAY_ROOT = '/overlay';

// Colors
const log = {
    info: (msg) => console.log(chalk.blue('ℹ'), msg),
    success: (msg) => console.log(chalk.green('✓'), msg),
    warn: (msg) => console.log(chalk.yellow('⚠'), msg),
    error: (msg) => console.log(chalk.red('✗'), msg)
};

async function main() {
    console.log(chalk.cyan.bold('\n=== OverlayFS Manager Installer ===\n'));

    // Check root
    if (process.getuid() !== 0) {
        log.error('This installer requires root privileges. Please run with sudo.');
        process.exit(1);
    }

    // Check existing installation
    if (shell.test('-f', path.join(SCRIPTS_DIR, 'overlay.sh'))) {
        log.warn('OverlayFS Manager appears to be already installed.');
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: 'Reinstall', value: 'reinstall' },
                    { name: 'Uninstall existing', value: 'uninstall' },
                    { name: 'Exit', value: 'exit' }
                ]
            }
        ]);

        if (action === 'exit') {
            process.exit(0);
        } else if (action === 'uninstall') {
            log.info('Run: sudo ovm uninstall');
            process.exit(0);
        }
    }

    // System checks
    log.info('Checking system compatibility...');

    // OS check
    const osCheck = shell.exec('cat /etc/os-release | grep -i ID=', { silent: true });
    const os = osCheck.stdout.toLowerCase().replace(/"/g, '').trim();
    log.info(`Detected OS: ${os}`);

    // Kernel check
    const kernelVer = shell.exec('uname -r', { silent: true }).stdout.trim();
    const kernelNum = parseInt(shell.exec('uname -r | awk -F[-.] \'{print $4}\'', { silent: true }).stdout.trim());

    if (kernelNum < 690) {
        log.error(`Kernel version ${kernelVer} is too old. Requires 3.10.0-690 or higher.`);
        log.info('Try: yum update kernel');
        process.exit(1);
    }
    log.success(`Kernel version: ${kernelVer} (OK)`);

    // Check overlay module
    const hasOverlay = shell.exec('modinfo overlay', { silent: true }).code === 0;
    if (!hasOverlay) {
        log.warn('Overlay kernel module not found. Will attempt to load during installation.');
    } else {
        log.success('Overlay kernel module available');
    }

    // Configuration prompts
    const { config } = await inquirer.prompt([
        {
            type: 'input',
            name: 'overlayMountPoint',
            message: 'Overlay partition mount point:',
            default: '/overlay'
        },
        {
            type: 'checkbox',
            name: 'overlayDirs',
            message: 'Directories to make writable via overlay:',
            choices: [
                { name: '/etc (system configuration)', checked: true },
                { name: '/var (variable data)', checked: true },
                { name: '/tmp (temporary files)', checked: true },
                { name: '/usr/local (local software)', checked: true }
            ]
        },
        {
            type: 'confirm',
            name: 'clearTmpOnBoot',
            message: 'Clear /tmp on each boot?',
            default: true
        },
        {
            type: 'confirm',
            name: 'clearLogsOnBoot',
            message: 'Clear /var/log on each boot? (recommended for read-only systems)',
            default: false
        }
    ]);

    // Confirmation
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Ready to install. Continue?',
            default: true
        }
    ]);

    if (!confirm) {
        log.info('Installation cancelled.');
        process.exit(0);
    }

    // Installation
    const spinner = ora('Installing OverlayFS Manager...').start();

    // Update config
    const configPath = path.join(__dirname, '../scripts/config.sh');
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(
        'OVERLAY_DIR_CONFIG="/etc /var /tmp /usr/local $APP_DEV_CONFIG"',
        `OVERLAY_DIR_CONFIG="${config.overlayDirs.join(' ')}"`
    );
    configContent = configContent.replace(
        'CLEAR_DIR_CONFIG="/tmp /var/log /var/crash /var/cache"',
        `CLEAR_DIR_CONFIG="${config.clearTmpOnBoot ? '/tmp' : ''}${config.clearLogsOnBoot ? ' /var/log' : ''} /var/crash /var/cache"`.trim()
    );
    fs.writeFileSync(configPath, configContent);

    // Install dependencies
    spinner.text = 'Installing dependencies...';
    const pkgDir = path.join(__dirname, '../packages');
    if (shell.test('-d', pkgDir)) {
        shell.exec(`yum install -y ${pkgDir}/fuse3-libs-*.rpm`, { silent: true });
        shell.exec(`yum install -y ${pkgDir}/fuse-overlayfs-*.rpm`, { silent: true });
    }

    // Load kernel module
    shell.mkdir('-p', '/etc/modules-load.d');
    shell.exec('echo overlay > /etc/modules-load.d/overlay.conf', { silent: true });
    shell.exec('depmod', { silent: true });

    // Create directories
    spinner.text = 'Creating directories...';
    shell.mkdir('-p', SCRIPTS_DIR);
    shell.mkdir('-p', OVERLAY_ROOT);

    // Copy scripts
    shell.cp(path.join(__dirname, '../scripts/boot.sh'), SCRIPTS_DIR);
    shell.cp(path.join(__dirname, '../scripts/overlay.sh'), SCRIPTS_DIR);
    shell.cp(path.join(__dirname, '../scripts/config.sh'), SCRIPTS_DIR);
    shell.cp('-r', path.join(__dirname, '../scripts/service'), '/lib/systemd/system/');

    // Enable services
    shell.ln('-sf', '/lib/systemd/system/boot.service', '/lib/systemd/system/sysinit.target.wants/');
    shell.ln('-sf', '/lib/systemd/system/readonly.service', '/lib/systemd/system/sysinit.target.wants/');

    // Create symlink
    shell.ln('-sf', path.join(SCRIPTS_DIR, 'overlay.sh'), '/usr/bin/ovm');

    // Set permissions
    shell.chmod('-R', '750', SCRIPTS_DIR);
    shell.chown('-R', 'root:root', SCRIPTS_DIR);

    spinner.succeed('Installation complete!');

    console.log(chalk.green('\n✓ OverlayFS Manager has been installed successfully!\n'));
    console.log('Next steps:');
    console.log('  1. Create and format overlay partition (if not done)');
    console.log('     mkfs.xfs /dev/sdX  # or your preferred filesystem');
    console.log('     mount /dev/sdX /overlay');
    console.log('     Add to /etc/fstab for persistent mount');
    console.log('');
    console.log('  2. Reboot to activate:');
    console.log('     sudo reboot');
    console.log('');
    console.log('  3. After reboot, check status:');
    console.log('     ovm status');
    console.log('');

    const { reboot } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'reboot',
            message: 'Reboot now?',
            default: false
        }
    ]);

    if (reboot) {
        log.info('Rebooting...');
        shell.exec('shutdown -r now');
    }
}

main().catch(err => {
    log.error(err.message);
    process.exit(1);
});
