const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function listFiles(root, directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(root, target) : [path.relative(root, target).replaceAll('\\', '/')];
  }).sort();
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function createOfflinePackage(distDirectory, outputDirectory) {
  const dist = path.resolve(distDirectory);
  const output = path.resolve(outputDirectory);
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Run the production build before packaging offline');
  if (fs.existsSync(output)) throw new Error(`Offline output already exists: ${output}`);
  fs.mkdirSync(output, { recursive: true });
  fs.cpSync(dist, path.join(output, 'app'), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, 'offline-server.cjs'), path.join(output, 'server.cjs'));
  fs.writeFileSync(path.join(output, 'START.cmd'), '@echo off\r\nnode server.cjs\r\n', 'utf8');
  fs.writeFileSync(path.join(output, 'start.sh'), '#!/usr/bin/env sh\nnode server.cjs\n', 'utf8');
  const files = listFiles(output).filter(file => file !== 'manifest.json');
  const manifest = {
    formatVersion: 1,
    application: 'cell-quest',
    version: '4.0.0',
    entry: 'server.cjs',
    files: files.map(file => ({ path: file, sha256: sha256(path.join(output, file)) })),
  };
  fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const target = process.argv[2] || path.join(root, 'release', 'cell-quest-offline-4.0.0');
  const manifest = createOfflinePackage(path.join(root, 'dist'), target);
  console.log(`Offline package created: ${path.resolve(target)} (${manifest.files.length} files)`);
}

module.exports = { createOfflinePackage, listFiles, sha256 };
