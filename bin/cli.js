#!/usr/bin/env node

/**
 * OverlayFS Manager - CLI Entry Point
 * Copyright (c) 2024 OverlayFS Manager Contributors
 *
 * SPDX-License-Identifier: MIT
 */

const { program } = require('commander');
const chalk = require('chalk');
const gradient = require('gradient-string');
const ora = require('ora');
const inquirer = require('inquirer');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';
const SCRIPTS_DIR = '/scripts';
const OVERLAY_ROOT = '/overlay';

// ASCII Logo
const logo = `
#                     __
#   ___ _  _____ ____/ /__ ___ __
#  / _ \\ |/ / -_) __/ / _ \`/ // /
#  \\___/___/\\__/_/ /_/\_,_/\\_, /
#                         /___/
`;

function showLogo() {
  console.log(gradient.cristal(logo));
  console.log(chalk.gray(`  OverlayFS Manager v${VERSION}`));
  console.log(chalk.gray(`  https://github.com/quetta-1030/overlayfs-manager`));
  console.log();
}

function checkRoot() {
  if (process.env.USER !== 'root' && process.getuid() !== 0) {
    console.error(chalk.red('Error: This command requires root privileges. Please use sudo.'));
    process.exit(1);
  }
}

function getStatus() {
  const overlayScript = path.join(SCRIPTS_DIR, 'overlay.sh');
  const bootBackup = path.join(SCRIPTS_DIR, 'boot.sh.bak');

  if (!shell.test('-f', overlayScript)) {
    return 'uninstalled';
  } else if (shell.test('-f', bootBackup)) {
    return 'maintaining';
  } else {
    return 'installed';
  }
}

async function cmdInstall(options) {
  showLogo();
  checkRoot();

  const status = getStatus();
  if (status === 'installed') {
    console.log(chalk.green('OverlayFS Manager is already installed.'));
    return;
  }

  if (options.interactive || options.i) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmInstall',
        message: 'This will install OverlayFS Manager to your system. Continue?',
        default: true
      },
      {
        type: 'input',
        name: 'overlayDir',
        message: 'Overlay partition mount point:',
        default: '/overlay',
        when: (answers) => answers.confirmInstall
      },
      {
        type: 'checkbox',
        name: 'overlayDirs',
        message: 'Directories to make writable (overlay):',
        choices: [
          { name: '/etc', checked: true },
          { name: '/var', checked: true },
          { name: '/tmp', checked: true },
          { name: '/usr/local', checked: true }
        ],
        when: (answers) => answers.confirmInstall
      },
      {
        type: 'confirm',
        name: 'reboot',
        message: 'Reboot system after installation?',
        default: true,
        when: (answers) => answers.confirmInstall
      }
    ]);

    if (!answers.confirmInstall) {
      console.log(chalk.yellow('Installation cancelled.'));
      return;
    }

    // Update config
    const configPath = path.join(__dirname, '../scripts/config.sh');
    let config = fs.readFileSync(configPath, 'utf8');
    config = config.replace(
      'OVERLAY_DIR_CONFIG="/etc /var /tmp /usr/local $APP_DEV_CONFIG"',
      `OVERLAY_DIR_CONFIG="${answers.overlayDirs.join(' ')}"`
    );
    fs.writeFileSync(configPath, config);
  }

  const spinner = ora('Installing OverlayFS Manager...').start();

  // Check OS
  const osCheck = shell.exec('cat /etc/os-release | grep -i ID=', { silent: true });
  if (!osCheck.stdout.toLowerCase().includes('centos') &&
      !osCheck.stdout.toLowerCase().includes('rhel') &&
      !osCheck.stdout.toLowerCase().includes('almalinux') &&
      !osCheck.stdout.toLowerCase().includes('rocky')) {
    spinner.warn();
    console.log(chalk.yellow('Warning: This system may not be fully supported. Tested on CentOS/RHEL 7.'));
  }

  // Check kernel
  spinner.text = 'Checking kernel version...';
  const kernelVer = shell.exec('uname -r | awk -F[-.] \'{print $4}\'', { silent: true }).stdout.trim();
  if (parseInt(kernelVer) < 690) {
    spinner.fail();
    console.log(chalk.red(`Error: Kernel version too old (${kernelVer}). Requires 3.10.0-690 or higher.`));
    console.log(chalk.green('Try: yum update kernel'));
    process.exit(1);
  }

  // Install dependencies
  spinner.text = 'Installing dependencies...';
  const pkgDir = path.join(__dirname, '../packages');
  if (shell.test('-d', pkgDir)) {
    shell.exec(`yum install -y ${pkgDir}/fuse3-libs-*.rpm`, { silent: true });
    shell.exec(`yum install -y ${pkgDir}/fuse-overlayfs-*.rpm`, { silent: true });
  }

  // Load kernel module
  shell.exec('echo overlay > /etc/modules-load.d/overlay.conf', { silent: true });
  shell.exec('depmod', { silent: true });

  // Copy scripts
  spinner.text = 'Installing scripts...';
  shell.mkdir('-p', SCRIPTS_DIR);
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

  spinner.succeed('OverlayFS Manager installed successfully!');
  console.log(chalk.green('\nPlease reboot your system to activate overlay.'));

  if (!options.interactive && !options.i) {
    const { reboot } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reboot',
        message: 'Reboot now?',
        default: true
      }
    ]);
    if (reboot) {
      shell.exec('shutdown -r now');
    }
  }
}

async function cmdStatus() {
  showLogo();
  const status = getStatus();

  const statusColors = {
    'uninstalled': chalk.red,
    'installed': chalk.green,
    'maintaining': chalk.blue
  };

  const statusIcons = {
    'uninstalled': '✗',
    'installed': '✓',
    'maintaining': '⚙'
  };

  console.log(`Status: ${statusColors[status](`${statusIcons[status]} ${status.toUpperCase()}`)}`);

  if (status === 'installed') {
    console.log(chalk.gray('\nSystem is running in read-only mode.'));
  } else if (status === 'maintaining') {
    console.log(chalk.gray('\nSystem is in maintenance mode (writable).'));
  }
}

async function cmdReset() {
  checkRoot();
  const status = getStatus();

  if (status !== 'installed') {
    console.log(chalk.red('Error: OverlayFS Manager is not installed.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'This will reset all overlay changes. Continue?',
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Reset cancelled.'));
    return;
  }

  const spinner = ora('Resetting overlay...').start();

  // Source config to get overlay dirs
  const configContent = shell.cat(path.join(SCRIPTS_DIR, 'config.sh')).stdout;
  const overlayDirsMatch = configContent.match(/OVERLAY_DIR_CONFIG="([^"]+)"/);

  if (overlayDirsMatch) {
    const dirs = overlayDirsMatch[1].split(' ');
    for (const dir of dirs) {
      const upperDir = path.join(OVERLAY_ROOT, `.${dir.replace(/^\//, '')}/upper`);
      if (shell.test('-d', upperDir)) {
        shell.rm('-rf', `${upperDir}/*`);
      }
    }
  }

  spinner.succeed('Overlay reset to factory state.');
}

async function cmdMaintain(enable) {
  checkRoot();
  const status = getStatus();

  if (status === 'uninstalled') {
    console.log(chalk.red('Error: OverlayFS Manager is not installed.'));
    return;
  }

  if (enable) {
    if (status === 'maintaining') {
      console.log(chalk.blue('Already in maintenance mode.'));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Enable maintenance mode? System will be writable after reboot.',
        default: true
      }
    ]);

    if (!confirm) return;

    const spinner = ora('Enabling maintenance mode...').start();
    shell.mv(
      path.join(SCRIPTS_DIR, 'boot.sh'),
      path.join(SCRIPTS_DIR, 'boot.sh.bak')
    );
    shell.exec('sync');
    spinner.succeed('Maintenance mode enabled.');
    console.log(chalk.green('\nReboot to apply. System will be writable.'));

    const { reboot } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reboot',
        message: 'Reboot now?',
        default: true
      }
    ]);
    if (reboot) {
      shell.exec('shutdown -r now');
    }
  } else {
    if (status !== 'maintaining') {
      console.log(chalk.blue('Not in maintenance mode.'));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Disable maintenance mode? System will be read-only after reboot.',
        default: true
      }
    ]);

    if (!confirm) return;

    const spinner = ora('Disabling maintenance mode...').start();
    shell.mv(
      path.join(SCRIPTS_DIR, 'boot.sh.bak'),
      path.join(SCRIPTS_DIR, 'boot.sh')
    );
    shell.exec('sync');
    spinner.succeed('Maintenance mode disabled.');
    console.log(chalk.green('\nReboot to apply. System will be read-only.'));

    const { reboot } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reboot',
        message: 'Reboot now?',
        default: true
      }
    ]);
    if (reboot) {
      shell.exec('shutdown -r now');
    }
  }
}

async function cmdUninstall() {
  checkRoot();
  const status = getStatus();

  if (status === 'uninstalled') {
    console.log(chalk.red('Error: OverlayFS Manager is not installed.'));
    return;
  }

  if (status === 'maintaining') {
    console.log(chalk.red('Error: Please disable maintenance mode first.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'This will completely remove OverlayFS Manager. Continue?',
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Uninstall cancelled.'));
    return;
  }

  const spinner = ora('Uninstalling...').start();

  // Remove services
  shell.rm('-f', '/lib/systemd/system/boot.service');
  shell.rm('-f', '/lib/systemd/system/sysinit.target.wants/boot.service');
  shell.rm('-f', '/lib/systemd/system/readonly.service');
  shell.rm('-f', '/lib/systemd/system/sysinit.target.wants/readonly.service');

  // Remove overlay dirs
  const configContent = shell.cat(path.join(SCRIPTS_DIR, 'config.sh')).stdout;
  const overlayDirsMatch = configContent.match(/OVERLAY_DIR_CONFIG="([^"]+)"/);
  if (overlayDirsMatch) {
    const dirs = overlayDirsMatch[1].split(' ');
    for (const dir of dirs) {
      const upperDir = path.join(OVERLAY_ROOT, `.${dir.replace(/^\//, '')}/upper`);
      shell.rm('-rf', path.dirname(upperDir));
    }
  }

  // Remove scripts
  shell.rm('-rf', SCRIPTS_DIR);
  shell.rm('-f', '/usr/bin/ovm');

  spinner.succeed('OverlayFS Manager uninstalled.');
  console.log(chalk.green('\nReboot recommended.'));
}

program
  .name('ovm')
  .version(VERSION)
  .description('OverlayFS Manager - Read-only root filesystem utility');

program
  .command('install')
  .description('Install OverlayFS Manager')
  .option('-i, --interactive', 'Interactive installation mode')
  .action(cmdInstall);

program
  .command('status')
  .description('Check installation status')
  .action(cmdStatus);

program
  .command('reset')
  .description('Reset overlay to factory state')
  .action(cmdReset);

program
  .command('maintain <on|off>')
  .description('Toggle maintenance mode')
  .action((state) => {
    if (state === 'on') {
      cmdMaintain(true);
    } else if (state === 'off') {
      cmdMaintain(false);
    } else {
      console.log(chalk.red('Invalid state. Use "on" or "off".'));
    }
  });

program
  .command('uninstall')
  .description('Uninstall OverlayFS Manager')
  .action(cmdUninstall);

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  showLogo();
  program.outputHelp();
}
