# CodeBuddy Evidence, Demo, and Scoring Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Architecture amendment — 2026-07-26:** Capture the Vue/TypeScript foundation, typed engine boundary, manual case designer and legacy cutover as real CodeBuddy architecture evidence. `deck.html` becomes a Vite mount page and visible deck changes belong in `src/deck/`; legacy inline deck instructions are presentation requirements, not final file boundaries.

**Goal:** 将真实的 AI 协作过程、工程验证结果和游戏价值整理为可审计证据，并制作一套4分钟内清晰证明八个评分模块的现场演示与离线备份。

**Architecture:** 证据以版本控制内的 Markdown 索引为中心，链接到真实提交、测试输出、截图和决策记录。演示材料从同一份评分映射生成，现场、视频、PPT和备用截图使用一致叙事，不制造或夸大 AI 参与记录。

**Tech Stack:** Markdown、Git、Vue/Vite deck、Vitest与Playwright报告、Node报告脚本、浏览器录屏。

## Global Constraints

- 只使用真实存在的 CodeBuddy 对话、提交、测试、截图和人工决策。
- 无法导出的对话明确标为“未归档”，不得补写成历史原文。
- 运行时 AI 与 CodeBuddy 开发协作必须分开说明。
- 每项评分证据必须能在60秒内打开或展示。
- 现场演示目标时长4分钟，硬上限4分30秒。
- 在线演示失败时，离线包必须在30秒内接管。
- 证据索引必须区分架构设计、兼容基础、Vue病例设计器、遗留适配器和未来Phaser切换，不得把计划文档写成已实现功能。
- 测试报告必须分别列出TypeScript、ESLint、Vitest领域测试、Vue组件测试、Playwright、生产构建和服务端测试结果。
- 所有截图和视频隐藏 API Key、个人路径、邮箱和无关私人信息。

---

### Task 1: AI development evidence schema and source inventory

**Files:**
- Create: `AI_DEVELOPMENT.md`
- Create: `docs/evidence/README.md`
- Create: `docs/evidence/evidence-index.json`
- Create: `scripts/validate-evidence.cjs`
- Create: `tests/evidence-validation.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: versioned evidence index and validator.

- [ ] **Step 1: Write failing evidence validation test**

Require every index entry to contain:

```json
{
  "id": "case-engine-design",
  "category": "architecture",
  "claim": "AI协助将角色切换方案收敛为固定角色病例引擎",
  "artifact": "docs/superpowers/specs/2026-07-25-case-director-core-gameplay-design.md",
  "commit": "1bf1e3e",
  "verification": "git show 1bf1e3e --stat",
  "humanDecision": "保留血小板代码但删除入口；取消关内切换"
}
```

- [ ] **Step 2: Implement validator**

Reject entries when:

- ID duplicates.
- artifact does not exist.
- commit hash is not seven or more hex characters.
- category is outside `requirements`, `architecture`, `implementation`, `debugging`, `testing`, `content`, `review`.
- claim or human decision is empty.
- artifact path leaves the repository.

- [ ] **Step 3: Inventory real evidence**

Use:

```powershell
git log --oneline --decorate -30
git show --stat 1bf1e3e
rg -n "AI|CodeBuddy|director|test|fix" docs PRD-v3.md CHANGELOG-v3.md
```

Record only verifiable items. Include the existing stability commit and new case design commit.

- [ ] **Step 4: Structure `AI_DEVELOPMENT.md`**

Required sections:

1. 项目与评分目标。
2. AI参与的需求拆解。
3. 玩法方案的三次关键取舍。
4. 架构与安全边界。
5. AI生成代码后的人工审查与纠错。
6. 测试驱动过程。
7. 失败案例与修复。
8. AI适合与不适合承担的工作。
9. 证据索引。
10. 最终测试结果。

- [ ] **Step 5: Add scripts**

```json
{
  "scripts": {
    "validate:evidence": "node scripts/validate-evidence.cjs"
  }
}
```

- [ ] **Step 6: Run validation**

Run:

```powershell
node --test tests/evidence-validation.test.cjs
npm run validate:evidence
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add AI_DEVELOPMENT.md docs/evidence/README.md docs/evidence/evidence-index.json scripts/validate-evidence.cjs tests/evidence-validation.test.cjs package.json
git commit -m "docs: index verifiable AI development evidence"
```

### Task 2: Capture requirement-to-fix case studies

**Files:**
- Create: `docs/evidence/case-studies/01-gameplay-redesign.md`
- Create: `docs/evidence/case-studies/02-ai-safety.md`
- Create: `docs/evidence/case-studies/03-debugging-and-tests.md`
- Create: `docs/evidence/screenshots/`
- Modify: `docs/evidence/evidence-index.json`

**Interfaces:**
- Produces: three concise, auditable AI collaboration case studies.

- [ ] **Step 1: Write gameplay redesign case study**

Use this exact structure:

```text
评分问题
→ 初始建议
→ 体验者反对意见
→ AI提出的替代方案
→ 人工确认的取舍
→ 最终规格
→ 实现与测试
```

Document:

- “像马里奥”反馈.
- three route options.
- rejected switching design.
- fixed single player roles.
- co-op one red/one white.
- AI crisis director.

- [ ] **Step 2: Write AI safety case study**

Show before/after:

- browser localStorage key and direct upstream call.
- server environment variable.
- strict JSON schema.
- timeout and local fallback.
- security tests.

Do not include real key values.

- [ ] **Step 3: Write debugging and tests case study**

Select at least two real failures:

- finish gate bypassing configured win conditions.
- invalid/malicious custom level input.
- one failure discovered while implementing the case engine.

For each include failing test, root cause, code change and passing command output.

- [ ] **Step 4: Capture evidence screenshots**

Capture:

- requirement discussion.
- design document.
- failing test.
- corrected implementation diff.
- passing test summary.
- AI decision trace in game.

Name files with date and evidence ID. Redact only secrets/private data; do not alter technical outcomes.

- [ ] **Step 5: Update index and validate**

Run: `npm run validate:evidence`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add docs/evidence/case-studies docs/evidence/screenshots docs/evidence/evidence-index.json
git commit -m "docs: add AI collaboration case studies"
```

### Task 3: Automated test and quality report

**Files:**
- Create: `scripts/generate-test-report.cjs`
- Create: `docs/evidence/TEST_REPORT.md`
- Modify: `package.json`
- Modify: `docs/evidence/evidence-index.json`

**Interfaces:**
- Consumes: JSON test reporters and content/evidence validators.
- Produces: reproducible `TEST_REPORT.md`.

- [ ] **Step 1: Configure machine-readable test output**

Add scripts that write:

- Playwright JSON to `test-results/playwright.json`.
- Node test output to `test-results/node.tap`.
- content validation output.
- evidence validation output.

Keep `test-results/` ignored except the generated summarized Markdown.

- [ ] **Step 2: Implement report generator**

The report includes:

- generation timestamp.
- git commit.
- Node/browser versions.
- total/pass/fail/skipped tests.
- test files by scoring module.
- six official case audit.
- performance metrics.
- manual QA links.
- exact reproduction commands.

- [ ] **Step 3: Add package script**

```json
{
  "scripts": {
    "report:tests": "npm run test:all && node scripts/generate-test-report.cjs"
  }
}
```

- [ ] **Step 4: Generate and verify**

Run: `npm run report:tests`

Expected: exit0 and `docs/evidence/TEST_REPORT.md` names the current commit.

- [ ] **Step 5: Update evidence index**

Add the report as testing evidence, with `npm run report:tests` as verification.

- [ ] **Step 6: Commit**

```powershell
git add scripts/generate-test-report.cjs docs/evidence/TEST_REPORT.md package.json docs/evidence/evidence-index.json .gitignore
git commit -m "docs: generate reproducible quality evidence"
```

### Task 4: Eight-module scoring crosswalk

**Files:**
- Create: `docs/evidence/SCORING_CROSSWALK.md`
- Modify: `docs/evidence/evidence-index.json`

**Interfaces:**
- Produces: one-page evidence lookup for judges and presenters.

- [ ] **Step 1: Create one section per scoring module**

Each section must include:

- one-sentence claim.
- implemented feature.
- visible demo moment.
- source file.
- test.
- screenshot/video fallback.
- known limitation stated honestly.

- [ ] **Step 2: Use these primary mappings**

| Module | Demo moment |
|---|---|
| AI方向 | AI生成受限病例蓝图，运行时再根据表现激活第二阶段危机 |
| 玩法方向 | 红细胞供氧、白细胞清感染，终点不通关 |
| 产品方向 | 报告→AI生成草案→编辑试玩→CQ2分享→每日挑战 |
| 玩家方向 | 病例指标恶化、角色职责和章节因果 |
| 行业方向 | 来源明确的知识判断影响准备加成 |
| 主题契合度 | 六章患者康复与最终协作报告 |
| AI使用情况 | CodeBuddy案例、失败测试、人工纠错 |
| 游戏质量 | 六关通关、性能、可访问性和线上地址 |

- [ ] **Step 3: Add “do not claim” notes**

Examples:

- 本地回退不是在线AI。
- AI生成的是病例蓝图，不是未经验证即可执行的地图或代码。
- 分享码不是云社区。
- 分数不是临床指标。
- 哈希证明不是反作弊。

- [ ] **Step 4: Validate links**

Run a script or manual link check so every local artifact and test path exists.

- [ ] **Step 5: Commit**

```powershell
git add docs/evidence/SCORING_CROSSWALK.md docs/evidence/evidence-index.json
git commit -m "docs: map every score item to visible evidence"
```

### Task 5: Four-minute competition deck and live script

**Files:**
- Modify: `deck.html`
- Create: `docs/demo/LIVE_DEMO_SCRIPT.md`
- Create: `docs/demo/DEMO_STATE.md`
- Create: `tests/deck.spec.js`

**Interfaces:**
- Produces: timed presenter script and deterministic demo save.

- [ ] **Step 1: Write failing deck content test**

Assert the deck includes:

- one-sentence game pitch.
- core loop.
- runtime AI diagram.
- AI病例生成、确定性编译和编辑器确认流程.
- red/white responsibilities.
- patient story.
- social value and sources.
- product loop.
- CodeBuddy evidence.
- test/release summary.

- [ ] **Step 2: Rebuild deck order**

Slides:

1. 患者与问题：20s.
2. 核心病例循环：25s.
3. AI病情导演：35s.
4. 现场玩法与双人协作：100s.
5. 病例报告和知识：30s.
6. AI生成病例草案、编辑、CQ2分享和每日病例：25s.
7. CodeBuddy协作证据：25s.
8. 社会价值、质量与总结：20s.

- [ ] **Step 3: Write word-for-word live script**

The script states exact clicks, keys, expected screen state and spoken line. Mark optional content that is skipped if time reaches3:30.

- [ ] **Step 4: Create deterministic demo state**

Document a clean demo profile:

- chapter unlocked.
- fixed local fallback seed.
- known AI-online response fixture for rehearsal only.
- player positions.
- expected first crisis.
- expected second crisis.
- editor sample share code.
- prevalidated generated case draft and its local/AI source badge.

Do not embed fake online AI results in production gameplay.

- [ ] **Step 5: Add deck test**

Check links, image existence, no overflow at `1920×1080`, no replacement characters and no secret patterns.

- [ ] **Step 6: Run**

Run: `npx playwright test tests/deck.spec.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add deck.html docs/demo/LIVE_DEMO_SCRIPT.md docs/demo/DEMO_STATE.md tests/deck.spec.js
git commit -m "docs: build four-minute competition demonstration"
```

### Task 6: Online, offline, and recorded fallback package

**Files:**
- Create: `docs/demo/FAILOVER_RUNBOOK.md`
- Create: `scripts/package-offline-demo.cjs`
- Modify: `package.json`
- Create: `tests/offline-demo.test.cjs`
- Create: `docs/evidence/RELEASE_EVIDENCE.md`

**Interfaces:**
- Produces: offline ZIP, failover runbook, release evidence summary.

- [ ] **Step 1: Write failing package test**

Assert packaged archive contains:

- application files.
- production dependencies required to start.
- local director.
- demo save import instructions.
- start script.
- no `.git`, env file, API Key or test artifacts.

- [ ] **Step 2: Implement packager**

Create a clean staging directory, copy the allow-listed files, generate a manifest with SHA-256 hashes, then archive it. Do not copy the workspace recursively.

- [ ] **Step 3: Write failover runbook**

Decision sequence:

```text
Online AI responds
→ continue live

Online AI times out
→ point out “本地导演” badge
→ continue same case

Public site unavailable
→ start local package
→ open localhost

Local runtime unavailable
→ play 90-second recorded demo
→ use screenshots for editor and evidence
```

- [ ] **Step 4: Rehearse three times**

Record:

- total time.
- failure or hesitation.
- failover activation time.
- judge-facing explanation of AI/local source.

All three rehearsals must finish under4:30.

- [ ] **Step 5: Generate release evidence**

List online URL, health result, release commit/tag, offline package hash, test report, demo video and date.

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test tests/offline-demo.test.cjs
npm run validate:evidence
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add docs/demo/FAILOVER_RUNBOOK.md scripts/package-offline-demo.cjs package.json tests/offline-demo.test.cjs docs/evidence/RELEASE_EVIDENCE.md
git commit -m "chore: package resilient competition demo"
```
