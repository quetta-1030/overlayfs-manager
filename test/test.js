#!/usr/bin/env node

/**
 * OverlayFS Manager - Test Suite
 * Copyright (c) 2024 OverlayFS Manager Contributors
 *
 * SPDX-License-Identifier: MIT
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== OverlayFS Manager Test Suite ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (err) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${err.message}`);
        failed++;
    }
}

// Test 1: Package.json validation
test('package.json is valid', () => {
    const pkg = require('../package.json');
    assert(pkg.name === 'overlayfs-manager', 'Package name should be overlayfs-manager');
    assert(pkg.version === '1.0.0', 'Version should be 1.0.0');
    assert(pkg.bin.ovm === './bin/cli.js', 'Should have ovm binary');
    assert(pkg.dependencies, 'Should have dependencies');
});

// Test 2: CLI script exists and is valid
test('bin/cli.js exists and is valid JS', () => {
    const cliPath = path.join(__dirname, '../bin/cli.js');
    assert(fs.existsSync(cliPath), 'cli.js should exist');
    const content = fs.readFileSync(cliPath, 'utf8');
    assert(content.includes('#!/usr/bin/env node'), 'Should have shebang');
    assert(content.includes('commander'), 'Should use commander');
});

// Test 3: Install script exists
test('bin/install.js exists', () => {
    const installPath = path.join(__dirname, '../bin/install.js');
    assert(fs.existsSync(installPath), 'install.js should exist');
});

// Test 4: Lib module exports correctly
test('lib/overlayfs.js exports OverlayFSManager class', () => {
    const OVM = require('../lib/overlayfs');
    assert(typeof OVM === 'function', 'Should export a constructor');
    const ovm = new OVM();
    assert(typeof ovm.getStatus === 'function', 'Should have getStatus method');
    assert(typeof ovm.install === 'function', 'Should have install method');
    assert(typeof ovm.reset === 'function', 'Should have reset method');
    assert(typeof ovm.uninstall === 'function', 'Should have uninstall method');
});

// Test 5: Index.js exports correctly
test('index.js exports OverlayFSManager', () => {
    const OVM = require('../index.js');
    assert(typeof OVM === 'function', 'Should export the class');
});

// Test 6: Scripts exist
test('scripts/overlay.sh exists', () => {
    const scriptPath = path.join(__dirname, '../scripts/overlay.sh');
    assert(fs.existsSync(scriptPath), 'overlay.sh should exist');
});

test('scripts/boot.sh exists', () => {
    const scriptPath = path.join(__dirname, '../scripts/boot.sh');
    assert(fs.existsSync(scriptPath), 'boot.sh should exist');
});

test('scripts/config.sh exists', () => {
    const scriptPath = path.join(__dirname, '../scripts/config.sh');
    assert(fs.existsSync(scriptPath), 'config.sh should exist');
});

// Test 7: Service files exist
test('scripts/service/boot.service exists', () => {
    const servicePath = path.join(__dirname, '../scripts/service/boot.service');
    assert(fs.existsSync(servicePath), 'boot.service should exist');
});

test('scripts/service/readonly.service exists', () => {
    const servicePath = path.join(__dirname, '../scripts/service/readonly.service');
    assert(fs.existsSync(servicePath), 'readonly.service should exist');
});

// Test 8: No company traces
test('No ZY or zy references in code', () => {
    const files = [
        '../scripts/config.sh',
        '../scripts/boot.sh',
        '../scripts/overlay.sh',
        '../bin/cli.js',
        '../bin/install.js'
    ];

    for (const file of files) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            assert(!content.includes('ZY_DEV'), `${file} should not contain ZY_DEV`);
            assert(!content.includes('zy'), `${file} should not contain zy`);
        }
    }
});

// Test 9: Documentation files exist
test('README.md exists', () => {
    assert(fs.existsSync(path.join(__dirname, '../README.md')), 'README.md should exist');
});

test('LICENSE exists', () => {
    assert(fs.existsSync(path.join(__dirname, '../LICENSE')), 'LICENSE should exist');
});

test('CHANGELOG.md exists', () => {
    assert(fs.existsSync(path.join(__dirname, '../CHANGELOG.md')), 'CHANGELOG.md should exist');
});

test('CONTRIBUTING.md exists', () => {
    assert(fs.existsSync(path.join(__dirname, '../CONTRIBUTING.md')), 'CONTRIBUTING.md should exist');
});

// Test 10: Config validation
test('config.sh has correct structure', () => {
    const configPath = path.join(__dirname, '../scripts/config.sh');
    const content = fs.readFileSync(configPath, 'utf8');
    assert(content.includes('APP_DEV_CONFIG'), 'Should use APP_DEV_CONFIG');
    assert(content.includes('OVERLAY_DIR_CONFIG'), 'Should have OVERLAY_DIR_CONFIG');
    assert(content.includes('CLEAR_DIR_CONFIG'), 'Should have CLEAR_DIR_CONFIG');
    assert(content.includes('FSCK_CONFIG'), 'Should have FSCK_CONFIG');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);
