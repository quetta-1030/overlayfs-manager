# OverlayFS Manager 用户手册

## 目录

1. [产品简介](#产品简介)
2. [系统要求](#系统要求)
3. [安装指南](#安装指南)
4. [使用指南](#使用指南)
5. [配置说明](#配置说明)
6. [故障排除](#故障排除)
7. [常见问题](#常见问题)

---

## 产品简介

OverlayFS Manager 是一个轻量级的 Linux 只读根文件系统管理工具，基于 OverlayFS 技术实现。

### 主要功能

- **只读根文件系统** - 将系统根目录设置为只读，防止意外修改或恶意篡改
- **快速恢复** - 一键重置到出厂状态
- **维护模式** - 临时启用写入权限进行系统更新
- **交互式安装** - 提供 TUI 界面引导安装

### 工作原理

```
                    系统启动
                       │
                       ▼
        ┌──────────────────────────┐
        │   systemd boot.service   │
        └──────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │    /scripts/boot.sh      │
        └──────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   根目录 remount   业务分区      创建 overlay
     为只读         remount 只读      挂载点
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │  /etc  /var  /tmp 等     │
        │  通过 overlay 可写       │
        │  修改存储在/overlay      │
        └──────────────────────────┘
```

### 目录结构

```
overlayfs-manager/
├── bin/                    # Node.js CLI 工具
│   ├── cli.js             # 主命令行工具
│   └── install.js         # 安装向导
├── lib/                    # Node.js API
│   └── overlayfs.js       # 程序化接口
├── scripts/               # Shell 脚本
│   ├── overlay.sh         # 主管理脚本
│   ├── boot.sh            # 启动脚本
│   ├── config.sh          # 配置文件
│   └── service/           # systemd 服务
│       ├── boot.service
│       └── readonly.service
└── packages/              # 依赖包
    ├── fuse3-libs-*.rpm
    └── fuse-overlayfs-*.rpm
```

---

## 系统要求

### 硬件要求

- 内存：最低 512MB，推荐 1GB+
- 磁盘：需要额外分区用于 `/overlay`（建议 5GB+）

### 软件要求

| 组件 | 要求 |
|------|------|
| 操作系统 | CentOS 7 / RHEL 7 / AlmaLinux 8+ / Rocky Linux 8+ |
| 内核 | 3.10.0-690 或更高版本 |
| Node.js | 14.x 或更高版本（CLI 工具） |
| 权限 | root/sudo 访问权限 |

### 内核模块

需要 `overlay` 内核模块支持：

```bash
# 检查模块是否可用
modinfo overlay

# 加载模块
sudo modprobe overlay
```

---

## 安装指南

### 方式一：npm 安装（推荐）

```bash
# 全局安装
sudo npm install -g overlayfs-manager

# 运行交互式安装
sudo ovm install
# 或
sudo ovm install --interactive
```

### 方式二：源码安装

```bash
# 克隆仓库
git clone https://github.com/quetta-1030/overlayfs-manager.git
cd overlayfs-manager

# 安装依赖
npm install

# 运行安装
sudo npm run install-system
# 或
sudo node bin/install.js
```

### 安装步骤说明

1. **系统检查**
   - 检查操作系统兼容性
   - 验证内核版本
   - 检查 overlay 模块

2. **配置分区**
   - 准备 `/overlay` 分区
   - 格式化为 xfs 或 ext4

   ```bash
   # 创建分区（示例，根据实际情况调整）
   fdisk /dev/sdb
   mkfs.xfs /dev/sdb1
   mount /dev/sdb1 /overlay

   # 添加到 fstab
   echo "/dev/sdb1 /overlay xfs defaults 0 0" >> /etc/fstab
   ```

3. **安装依赖**
   - 自动安装 fuse3-libs 和 fuse-overlayfs

4. **配置服务**
   - 启用 systemd 服务
   - 创建命令别名

5. **重启系统**
   - 重启后 overlay 生效

---

## 使用指南

### 命令参考

```bash
ovm <command> [options]

命令:
  install             安装 OverlayFS Manager
  status              查看当前状态
  reset               重置 overlay（清除所有修改）
  maintain on|off     开启/关闭维护模式
  uninstall           卸载 OverlayFS Manager
  --help, -h          显示帮助
  --version, -v       显示版本号
```

### 常用示例

#### 查看状态

```bash
$ ovm status

#                     __
#   ___ _  _____ ____/ /__ ___ __
#  / _ \ |/ / -_) __/ / _ `/ // /
#  \___/___/\__/_/ /\_,_/\_, /
#                         /___/

  OverlayFS Manager v1.0.0

Status: ✓ INSTALLED

系统运行在只读模式。
```

#### 安装（交互式）

```bash
$ sudo ovm install --interactive

=== OverlayFS Manager Installer ===

ℹ Checking system compatibility...
ℹ Detected OS: centos
✓ Kernel version: 3.10.0-1160.el7.x86_64 (OK)
✓ Overlay kernel module available

? Overlay partition mount point: /overlay
? Directories to make writable via overlay:
  [x] /etc (system configuration)
  [x] /var (variable data)
  [x] /tmp (temporary files)
  [x] /usr/local (local software)
? Clear /tmp on each boot? Yes
? Clear /var/log on each boot? No
? Ready to install. Continue? Yes

✓ Installing OverlayFS Manager...
✓ Installation complete!

Next steps:
  1. Create and format overlay partition (if not done)
  2. Reboot to activate: sudo reboot
  3. After reboot, check status: ovm status

? Reboot now? Yes
```

#### 重置 overlay

```bash
# 清除所有 overlay 修改，恢复出厂状态
sudo ovm reset

This will reset all overlay changes. Continue? (y/N)
```

#### 维护模式

```bash
# 开启维护模式（可写）
sudo ovm maintain on

# 进行系统更新...
yum update -c

# 关闭维护模式（只读）
sudo ovm maintain off
```

#### 卸载

```bash
# 完全卸载
sudo ovm uninstall

# 注意：需要先退出维护模式
```

---

## 配置说明

### 配置文件位置

`/scripts/config.sh` 或 `/etc/overlayfs-manager/config.sh`

### 配置项详解

```bash
# =============================================================================
# 用户配置区
# =============================================================================

# 额外设备挂载点（空格分隔）
# 例如：业务数据目录 /data /app 等
APP_DEV_CONFIG="/data /app"

# Overlay 目录列表
# 这些目录将通过 overlay 变为"可写"，实际修改存储在 /overlay
OVERLAY_DIR_CONFIG="/etc /var /tmp /usr/local $APP_DEV_CONFIG"

# 启动时清空的目录
# 适用于临时数据、缓存等
CLEAR_DIR_CONFIG="/tmp /var/log /var/crash /var/cache"

# 启动时执行 fsck 检查的分区
FSCK_CONFIG="/boot /overlay"

# =============================================================================
# 系统配置（通常无需修改）
# =============================================================================

# 脚本安装目录
SCRIPTS=/scripts

# Overlay 挂载点
OVERLAY_NAME=overlay
OVERLAY_ROOT=/$OVERLAY_NAME

# 命令超时（秒）
CMD_TIMEOUT=10

# 挂载命令
MOUNT_CMD=/bin/mount

# 版本号
OYT_RV="1.0.0"
```

### 配置示例

#### 最小化配置（仅 /etc 可写）

```bash
OVERLAY_DIR_CONFIG="/etc"
CLEAR_DIR_CONFIG="/tmp"
```

#### 完整服务器配置

```bash
APP_DEV_CONFIG="/data /app /backup"
OVERLAY_DIR_CONFIG="/etc /var /tmp /usr/local $APP_DEV_CONFIG"
CLEAR_DIR_CONFIG="/tmp /var/log /var/crash /var/cache /var/tmp"
FSCK_CONFIG="/boot /overlay /data"
```

---

## 故障排除

### 系统无法启动

**症状**: 安装 overlay 后系统无法正常启动

**解决**:
1. 进入单用户模式/救援模式
2. 挂载根文件系统为可写
3. 临时禁用 overlay 服务

```bash
# 在救援模式执行
mount -o rw,remount /
mv /scripts/boot.sh /scripts/boot.sh.bak
reboot
```

### overlay 未生效

**症状**: `ovm status` 显示 installed 但系统仍可写

**检查**:
```bash
# 检查服务状态
systemctl status boot.service
systemctl status readonly.service

# 检查挂载
mount | grep overlay

# 查看日志
journalctl -u boot.service
```

### 内核模块加载失败

**症状**: `modprobe overlay` 失败

**解决**:
```bash
# 更新内核
yum update kernel

# 重启后检查
reboot
lsmod | grep overlay
```

### 权限错误

**症状**: 执行命令提示权限不足

**解决**: 确保使用 root 或 sudo
```bash
sudo ovm install
```

---

## 常见问题

### Q: 安装 overlay 后数据会丢失吗？

A: 不会。overlay 只是将修改重定向到 /overlay 分区，原有数据保持不变。重置操作只会清除 /overlay 中的修改。

### Q: /overlay 分区需要多大？

A: 取决于使用场景：
- 最小配置（仅/etc）: 1GB
- 标准配置（/etc /var /tmp）: 5-10GB
- 完整配置：根据实际写入量评估

### Q: 如何备份 overlay 配置？

A: 备份 /overlay 目录即可：
```bash
tar czf overlay-backup.tar.gz /overlay
```

### Q: 支持哪些文件系统？

A: /overlay 分区支持任何 Linux 文件系统：
- XFS（推荐）
- EXT4
- BTRFS

### Q: 可以用于生产环境吗？

A: 可以，但建议：
1. 先在测试环境验证
2. 定期备份重要数据
3. 监控系统日志

### Q: 如何更新系统软件？

A: 进入维护模式后更新：
```bash
sudo ovm maintain on
# 重启后...
sudo yum update
sudo ovm maintain off
```

---

## 技术支持

- GitHub Issues: https://github.com/quetta-1030/overlayfs-manager/issues
- 文档：https://github.com/quetta-1030/overlayfs-manager#readme

---

## 版本历史

参见 [CHANGELOG.md](CHANGELOG.md)
