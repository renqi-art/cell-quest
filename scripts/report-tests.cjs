const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const checks = [
  ['TypeScript', ['run', 'typecheck']],
  ['ESLint', ['run', 'lint']],
  ['Vitest', ['run', 'test:unit']],
  ['Vue components', ['run', 'test:component']],
  ['AI director', ['run', 'test:director']],
  ['Node server', ['run', 'test:server']],
  ['Content tests', ['run', 'test:content']],
  ['Offline packager', ['run', 'test:offline']],
  ['Playwright', ['test']],
  ['Content validation', ['run', 'validate:content']],
  ['Production build', ['run', 'build']],
];

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const results = [];
for (const [name, args] of checks) {
  console.log(`REPORT: ${name}`);
  const startedAt = Date.now();
  const run = spawnSync(npm, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`.trim();
  results.push({ name, command: `npm ${args.join(' ')}`, exitCode: run.status ?? 1, durationMs: Date.now() - startedAt, output: output.split(/\r?\n/).slice(-12).join('\n') });
  if (run.status !== 0) break;
}

const passed = results.filter(result => result.exitCode === 0).length;
const failed = results.filter(result => result.exitCode !== 0).length;
const report = `# 自动化测试报告

Generated: ${new Date().toISOString()}

Candidate SHA: ${sha}
Version: 4.0.0
Node: ${process.version}
OS: ${os.type()} ${os.release()} ${os.arch()}
Browser: Playwright Chromium 1.61.1

| 检查 | 命令 | 退出码 | 用时 |
|---|---|---:|---:|
${results.map(result => `| ${result.name} | \`${result.command}\` | ${result.exitCode} | ${(result.durationMs / 1000).toFixed(1)}s |`).join('\n')}

总计：${results.length} 项；通过 ${passed}；失败 ${failed}；跳过 ${checks.length - results.length}。

## 命令尾部输出

${results.map(result => `### ${result.name}\n\n\`\`\`text\n${result.output}\n\`\`\``).join('\n\n')}

## 人工与外部项目

- 六章真实手工 QA：见 \`docs/qa/manual-case-results.md\`，未签字项目保持 PENDING。
- 实体参考机 1% low、在线部署、离线干净机器、视频和三次彩排不由本脚本伪造。
`;
fs.writeFileSync(path.join(root, 'docs/evidence/TEST_REPORT.md'), report, 'utf8');
console.log(`Test report written for ${sha}: ${passed} passed, ${failed} failed.`);
if (failed > 0 || results.length !== checks.length) process.exitCode = 1;
