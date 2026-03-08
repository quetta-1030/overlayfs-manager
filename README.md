# OverlayFS Manager

[![npm version](https://img.shields.io/npm/v/overlayfs-manager.svg)](https://www.npmjs.org/package/overlayfs-manager)
[![npm downloads](https://img.shields.io/npm/dm/overlayfs-manager.svg)](https://www.npmjs.org/package/overlayfs-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/quetta-1030/overlayfs-manager)](https://github.com/quetta-1030/overlayfs-manager/stargazers)

> **A powerful utility for creating read-only root filesystem on Linux using OverlayFS technology.**


---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Use Cases](#use-cases)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**OverlayFS Manager** transforms your Linux system into a secure, read-only environment using OverlayFS technology. Perfect for:

- 🔒 **Security-hardened systems** - Prevent unauthorized modifications
- 🖥️ **Edge devices** - Protect against accidental corruption
- 🏭 **Production servers** - Maintain consistent system state
- 📦 **Kiosk systems** - Lock down public-facing devices


---

## Features

| Feature | Description |
|---------|-------------|
| 🔒 **Read-Only Root** | System runs in read-only mode by default |
| 🔄 **One-Click Reset** | Factory reset with a single command |
| 🛠️ **Maintenance Mode** | Temporarily enable writes for updates |
| 📊 **Progress UI** | Visual progress bars during installation |
| ⚡ **Fast Boot** | Minimal impact on startup time |
| 🎯 **TUI Installer** | Interactive terminal-based setup wizard |


---

## How It Works

OverlayFS Manager uses Linux OverlayFS to create a union filesystem layer:

```
┌─────────────────────────────────────────────────────────────────┐
│                        SYSTEM BOOT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐   │
│   │   /etc      │      │   /var      │      │   /tmp      │   │
│   │  (overlay)  │      │  (overlay)  │      │  (overlay)  │   │
│   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘   │
│          │                    │                    │           │
│          ├───────┬────────────┼────────┬───────────┤           │
│          │       │            │        │           │           │
│   ┌──────▼────┐ ┌▼──────┐ ┌──▼────┐ ┌▼──────┐ ┌───▼────┐     │
│   │ lowerdir  │ │ upper │ │ work  │ │ clear │ │ persist│     │
│   │ (read-only│ │(writes│ │(meta  │ │(boot  │ │(overlay│     │
│   │  system)  │ │ here) │ │ data) │ │ clean)│ │  store)│     │
│   └───────────┘ └───────┘ └───────┘ └───────┘ └────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Boot Flow Diagram

```
                              ┌─────────────┐
                              │ Power On    │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │   Kernel    │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │  systemd    │
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
           ┌────────▼────────┐ ┌────▼────┐ ┌────────▼────────┐
           │ boot.service    │ │ other   │ │ readonly.service│
           │ (create overlay)│ │ services│ │ (remount root)  │
           └────────┬────────┘ └─────────┘ └────────┬────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     │
                              ┌──────▼──────┐
                              │   System    │
                              │    Ready    │
                              │ (Read-Only) │
                              └─────────────┘
```

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | CentOS 7, RHEL 7, AlmaLinux 8+, Rocky Linux 8+ |
| **Kernel** | 3.10.0-690 or higher |
| **RAM** | 512MB minimum, 1GB+ recommended |
| **Disk** | 5GB+ for overlay partition |
| **Node.js** | 14.x or higher (for CLI) |

### Compatibility Matrix


```bash
# Check your kernel version
uname -r

# Check overlay support
modinfo overlay
```

---

## Installation

### Method 1: npm (Recommended)

```bash
# Install globally
sudo npm install -g overlayfs-manager

# Verify installation
ovm --version
```

### Method 2: From Source

```bash
# Clone the repository
git clone https://github.com/quetta-1030/overlayfs-manager.git
cd overlayfs-manager

# Install dependencies
npm install

# Run installer
sudo npm run install-system
```

### Installation Steps Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    INSTALLATION PROCESS                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [1] System Check ──────────► Verify OS & Kernel             │
│       │                                                          │
│       ▼                                                          │
│  [2] Dependencies ──────────► Install fuse3, fuse-overlayfs    │
│       │                                                          │
│       ▼                                                          │
│  [3] Kernel Module ─────────► Load overlay module              │
│       │                                                          │
│       ▼                                                          │
│  [4] Copy Scripts ──────────► Deploy to /scripts               │
│       │                                                          │
│       ▼                                                          │
│  [5] Configure Systemd ─────► Enable boot services              │
│       │                                                          │
│       ▼                                                          │
│  [6] Create Symlink ────────► /usr/bin/ovm                     │
│       │                                                          │
│       ▼                                                          │
│  [7] Complete ──────────────► Reboot required                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Install OverlayFS Manager
sudo ovm install

# 2. (Optional) Interactive installation with prompts
sudo ovm install --interactive

# 3. Check status
ovm status

# 4. Reboot to activate
sudo reboot
```

### First Boot Experience

```
┌─────────────────────────────────────────────────────────────┐
│  OverlayFS Manager v1.0.0                                   │
│  https://github.com/quetta-1030/overlayfs-manager           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Status: ✓ INSTALLED                                        │
│                                                             │
│  System is running in READ-ONLY mode.                       │
│  All changes are stored in /overlay partition.              │
│                                                             │
│  Commands:                                                  │
│    ovm reset          - Reset to factory state              │
│    ovm maintain on    - Enable write mode for updates       │
│    ovm maintain off   - Return to read-only mode            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Command Reference

### All Commands

```bash
ovm <command> [options]

Commands:
  install             Install OverlayFS Manager to the system
  status              Check current installation status
  reset               Reset overlay (clear all changes since install)
  maintain on         Enable maintenance mode (writable filesystem)
  maintain off        Disable maintenance mode (read-only filesystem)
  uninstall           Completely remove OverlayFS Manager
  --help, -h          Show help information
  --version, -v       Show version number
```

### Command Flow Diagram

```
                              ┌─────────────┐
                              │   ovm cmd   │
                              └──────┬──────┘
                                     │
         ┌─────────────┬─────────────┼─────────────┬─────────────┐
         │             │             │             │             │
    ┌────▼────┐   ┌────▼────┐  ┌─────▼─────┐ ┌────▼────┐  ┌─────▼─────┐
    │ install │   │ status  │  │   reset   │ │ maintain│  │ uninstall │
    └────┬────┘   └────┬────┘  └─────┬─────┘ └────┬────┘  └─────┬─────┘
         │             │             │             │             │
         ▼             ▼             ▼             ▼             ▼
    ┌─────────┐  ┌─────────┐  ┌───────────┐ ┌─────────┐  ┌───────────┐
    │ Deploy  │  │ Display │  │ Clear     │ │ Toggle  │  │ Remove    │
    │ Scripts │  │ Status  │  │ /overlay  │ │ R/W     │  │ Everything│
    │ & Svc   │  │         │  │ upperdir  │ │ Mode    │  │           │
    └─────────┘  └─────────┘  └───────────┘ └─────────┘  └───────────┘
```

### Usage Examples

```bash
# Check installation status
$ ovm status
Status: ✓ INSTALLED
System is running in read-only mode.

# Install with interactive prompts
$ sudo ovm install --interactive
=== OverlayFS Manager Installer ===
? Overlay partition mount point: /overlay
? Directories to overlay: /etc, /var, /tmp, /usr/local
? Clear /tmp on boot? Yes
Ready to install. Continue? Yes
✓ Installation complete!

# Reset to factory state
$ sudo ovm reset
This will reset all overlay changes. Continue? (y/N) y
✓ Overlay reset complete.

# Enable maintenance mode for updates
$ sudo ovm maintain on
✓ Maintenance mode enabled.
Reboot to apply. System will be writable.

# After updates, return to read-only
$ sudo ovm maintain off
✓ Maintenance mode disabled.
Reboot to apply. System will be read-only.
```

---

## Configuration

### Configuration File

Edit `/scripts/config.sh` to customize behavior:

```bash
#!/bin/sh
# User Configuration Section

# Additional device mount points
APP_DEV_CONFIG="/data /app"

# Directories to overlay (appear writable)
OVERLAY_DIR_CONFIG="/etc /var /tmp /usr/local $APP_DEV_CONFIG"

# Directories to clear on each boot
CLEAR_DIR_CONFIG="/tmp /var/log /var/crash /var/cache"

# Partitions to fsck on boot
FSCK_CONFIG="/boot /overlay"
```

### Configuration Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFIGURATION LAYERS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  APP_DEV_CONFIG (Custom mount points)                       │
│  └── /data, /app                                            │
│         │                                                   │
│         ▼                                                   │
│  OVERLAY_DIR_CONFIG (Writable directories)                  │
│  ├── /etc (system config)                                   │
│  ├── /var (variable data)                                   │
│  ├── /tmp (temporary files)                                 │
│  └── /usr/local (local software)                            │
│         │                                                   │
│         ▼                                                   │
│  CLEAR_DIR_CONFIG (Cleared on boot)                         │
│  ├── /tmp                                                   │
│  ├── /var/log                                               │
│  └── /var/cache                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

### System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          USER SPACE                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   ovm CLI    │  │  Node.js API │  │  Shell Scripts│            │
│  │  (cli.js)    │  │ (overlayfs.js│  │  (overlay.sh) │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────┐         ┌────────────────────┐            │
│  │  boot.service      │         │  readonly.service  │            │
│  │  (create overlay)  │         │  (remount root)    │            │
│  └────────────────────┘         └────────────────────┘            │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                        KERNEL LAYER                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────┐           │
│  │              OverlayFS Kernel Module               │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
overlayfs-manager/
├── 📁 bin/                    # Node.js CLI tools
│   ├── cli.js                 # Main command-line interface
│   └── install.js             # Interactive installer
├── 📁 lib/                    # Node.js API library
│   └── overlayfs.js           # Programmatic interface
├── 📁 scripts/                # Shell scripts
│   ├── overlay.sh             # Main management script
│   ├── boot.sh                # Boot-time script
│   ├── config.sh              # Configuration file
│   └── 📁 service/            # systemd service files
│       ├── boot.service       # Boot service
│       └── readonly.service   # Read-only service
├── 📁 packages/               # RPM dependencies
│   ├── fuse3-libs-*.rpm
│   └── fuse-overlayfs-*.rpm
├── 📄 README.md               # This file
├── 📄 MANUAL.md               # Detailed user manual
├── 📄 package.json            # npm configuration
└── 📁 test/                   # Test suite
    ├── test.js                # Unit tests
    └── REPORT.md              # Test report
```

---

## Use Cases

### 1. Edge Computing Devices


```bash
# Scenario: Prevent filesystem corruption on remote devices
# Solution: Read-only root with overlay for /etc, /var
```

### 2. Security-Hardened Servers


```bash
# Scenario: Prevent unauthorized system modifications
# Solution: Base system read-only, changes auditable in /overlay
```

### 3. Kiosk Systems


```bash
# Scenario: Public-facing terminals need consistent state
# Solution: Factory reset on each boot with CLEAR_DIR_CONFIG
```

### 4. Production Environments


```bash
# Scenario: Maintain consistent production state
# Solution: Maintenance mode for controlled updates
```

---

## Troubleshooting

### Common Issues

```
┌─────────────────────────────────────────────────────────────────┐
│                    TROUBLESHOOTING GUIDE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Issue: System won't boot after install                         │
│  ─────────────────────────────────────────────                  │
│  Solution:                                                      │
│  1. Boot into single-user mode                                  │
│  2. mount -o rw,remount /                                       │
│  3. mv /scripts/boot.sh /scripts/boot.sh.bak                    │
│  4. reboot                                                      │
│                                                                 │
│  Issue: overlay module not found                                │
│  ─────────────────────────────────────────────                  │
│  Solution:                                                      │
│  1. yum update kernel                                           │
│  2. reboot                                                      │
│  3. modprobe overlay                                            │
│                                                                 │
│  Issue: Permission denied                                       │
│  ─────────────────────────────────────────────                  │
│  Solution: Use sudo or run as root                              │
│  1. sudo ovm install                                            │
│                                                                 │
│  Issue: System still writable after install                     │
│  ─────────────────────────────────────────────                  │
│  Solution: Check service status                                 │
│  1. systemctl status boot.service                               │
│  2. systemctl status readonly.service                           │
│  3. journalctl -u boot.service                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Diagnostic Commands

```bash
# Check overlay status
ovm status

# Check kernel module
lsmod | grep overlay

# Check mount points
mount | grep overlay

# Check services
systemctl status boot.service
systemctl status readonly.service

# View boot logs
journalctl -u boot.service -u readonly.service
```

---

## Contributing

We welcome contributions! Here's how you can help:

```
┌─────────────────────────────────────────────────────────────┐
│                   CONTRIBUTING WORKFLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Fork the repository                                     │
│         │                                                   │
│         ▼                                                   │
│  2. Create feature branch (git checkout -b feature/amazing) │
│         │                                                   │
│         ▼                                                   │
│  3. Make changes & test                                     │
│         │                                                   │
│         ▼                                                   │
│  4. Commit (git commit -m 'Add amazing feature')            │
│         │                                                   │
│         ▼                                                   │
│  5. Push (git push origin feature/amazing)                  │
│         │                                                   │
│         ▼                                                   │
│  6. Open Pull Request                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Areas We Need Help

- 📝 Documentation improvements
- 🧪 Test coverage
- 🎨 UI/UX enhancements
- 🐛 Bug fixes
- 📦 Package maintenance

---

## License

```
┌─────────────────────────────────────────────────────────────┐
│                      MIT LICENSE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Copyright (c) 2024 OverlayFS Manager Contributors          │
│                                                             │
│  Permission is hereby granted, free of charge, to any       │
│  person obtaining a copy of this software and associated    │
│  documentation files (the "Software"), to deal in the       │
│  Software without restriction, including without limitation │
│  the rights to use, copy, modify, merge, publish,           │
│  distribute, sublicense, and/or sell copies of the          │
│  Software, and to permit persons to whom the Software is    │
│  furnished to do so, subject to the following conditions:   │
│                                                             │
│  The above copyright notice and this permission notice      │
│  shall be included in all copies or substantial portions    │
│  of the Software.                                           │
│                                                             │
│  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF      │
│  ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED    │
│  TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A        │
│  PARTICULAR PURPOSE AND NONINFRINGEMENT.                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Links & Resources

- 📖 [Full Manual](MANUAL.md)
- 🐛 [Issue Tracker](https://github.com/quetta-1030/overlayfs-manager/issues)
- 📦 [npm Package](https://www.npmjs.com/package/overlayfs-manager)
- 📄 [Contributing Guide](CONTRIBUTING.md)
- 📋 [Changelog](CHANGELOG.md)

---

<div align="center">

**OverlayFS Manager** - Securing Linux Systems Since 2024

[![GitHub stars](https://img.shields.io/github/stars/quetta-1030/overlayfs-manager?style=social)](https://github.com/quetta-1030/overlayfs-manager/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/quetta-1030/overlayfs-manager?style=social)](https://github.com/quetta-1030/overlayfs-manager/network)

Made with ❤️ by the OverlayFS Manager Contributors

</div>
