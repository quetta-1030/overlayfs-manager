# OverlayFS Manager

[![npm version](https://img.shields.io/npm/v/overlayfs-manager.svg)](https://www.npmjs.org/package/overlayfs-manager)
[![npm downloads](https://img.shields.io/npm/dm/overlayfs-manager.svg)](https://www.npmjs.org/package/overlayfs-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight utility for managing overlayfs-based read-only root filesystem on Linux systems.

## Features

- 🔒 **Read-Only Root** - Transform your system into a read-only state for enhanced security
- 🔄 **Easy Recovery** - Reset to clean state with a single command
- 🛠️ **Maintenance Mode** - Temporarily enable write access for updates
- 📦 **Simple Installation** - Interactive TUI installer
- ⚡ **Fast Boot** - Minimal impact on system startup time

## Why OverlayFS?

OverlayFS is a union filesystem that allows you to overlay one directory on top of another. This project uses it to:
- Keep the base system read-only and immutable
- Store all changes in a separate writable layer
- Enable instant factory reset by clearing the writable layer

## Prerequisites

- **OS**: CentOS 7, RHEL 7, or compatible distributions
- **Kernel**: 3.10.0-690 or higher (with overlay module support)
- **Node.js**: 14.x or higher (for CLI tool)
- **Root**: sudo/root access required

## Installation

### Quick Install (npm)

```bash
# Install globally
npm install -g overlayfs-manager

# Run installer
sudo ovm install
```

### Manual Install

```bash
# Clone the repository
git clone https://github.com/quetta-1030/overlayfs-manager.git
cd overlayfs-manager

# Install dependencies
npm install

# Run installer
sudo npm run install-system
```

### Interactive Install

```bash
sudo ovm install --interactive
```

## Usage

### Command Reference

| Command | Description |
|---------|-------------|
| `ovm install` | Install overlayfs manager |
| `ovm status` | Check current status |
| `ovm reset` | Reset overlay (clear all changes) |
| `ovm maintain on` | Enable maintenance mode (writable) |
| `ovm maintain off` | Disable maintenance mode (read-only) |
| `ovm uninstall` | Remove overlayfs manager |

### Examples

```bash
# Check installation status
ovm status

# Install with interactive prompts
sudo ovm install

# Reset to factory state
sudo ovm reset

# Enable maintenance mode for system updates
sudo ovm maintain on
# ... make changes ...
sudo ovm maintain off

# Uninstall completely
sudo ovm uninstall
```

## Configuration

Edit `/etc/overlayfs-manager/config.sh` to customize:

```bash
# Directories to overlay (will be writable)
OVERLAY_DIR_CONFIG="/etc /var /tmp /usr/local"

# Directories to clear on boot
CLEAR_DIR_CONFIG="/tmp /var/log /var/crash /var/cache"

# Partitions to fsck on boot
FSCK_CONFIG="/boot /overlay"

# Additional mount points
APP_DEV_CONFIG="/data /app"
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      System Boot                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Root (/) ←─── overlayfs ───→ /overlay (writable layer)     │
│     │                              │                         │
│     ├─ /etc (ro) ←─── upper ───────┤                         │
│     ├─ /var (ro) ←─── upper ───────┤                         │
│     ├─ /tmp (ro) ←─── upper ───────┤                         │
│     └─ /usr/local (ro) ←─ upper ───┤                         │
│                                                              │
│  Changes → written to /overlay/.<dir>/upper                  │
│  Reset   → rm -rf /overlay/.*/upper/*                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## API (Node.js)

```javascript
const OverlayFSManager = require('overlayfs-manager');

const ovm = new OverlayFSManager();

// Check status
const status = await ovm.getStatus();
console.log(status); // 'installed' | 'uninstalled' | 'maintaining'

// Reset overlay
await ovm.reset();

// Toggle maintenance mode
await ovm.setMaintenanceMode(true);
```

## Troubleshooting

### Kernel module not loaded
```bash
# Load overlay module
sudo modprobe overlay

# Make it persistent
echo "overlay" | sudo tee /etc/modules-load.d/overlay.conf
```

### Permission denied
Ensure you're running with sudo/root privileges.

### Boot issues
Boot into single-user mode and run:
```bash
/scripts/overlay.sh maintain on
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- OverlayFS kernel developers
- systemd project
- All contributors
