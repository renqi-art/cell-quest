# Story, Education, and Player Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将六关串成一名患者从擦伤感染到恢复的完整故事，让医学知识通过病例判断影响玩法，并以清晰、沉浸、可复述的反馈强化主题与社会价值。

**Architecture:** `case-content.js` 保存版本化故事、学习目标、知识卡和来源；UI 层只按章节状态展示病例卡、AI危机、章节过渡和最终报告。知识判断通过安全的预设选项影响小幅准备加成，不把教育内容变成惩罚性考试。

**Tech Stack:** 原生 JavaScript、HTML/CSS、Canvas、Playwright、Node 内容校验脚本。

## Global Constraints

- 所有医学指标是游戏化抽象，界面必须显示“仅用于科普，不构成医疗建议”。
- 医学事实必须包含来源标题、机构、URL、访问日期和人工复核状态。
- 优先使用 WHO、NIH/NHLBI、NIAID、MedlinePlus 等权威来源。
- 不展示未经复核的精确流行病学数字。
- 知识题答错不得阻断通关，只失去小额准备加成并显示解释。
- 每个章节最多一张开始病例卡、一次知识判断和一张结算知识卡。
- 动画均可跳过，并遵守减少动态效果设置。

---

### Task 1: Versioned story and evidence-backed content schema

**Files:**
- Create: `js/case-content.js`
- Create: `scripts/validate-content.cjs`
- Create: `tests/content-validation.test.cjs`
- Modify: `index.html`
- Modify: `package.json`

**Interfaces:**
- Produces: `CASE_STORY_VERSION`, `CASE_CHAPTERS`, `KNOWLEDGE_SOURCES`, `getCaseChapter(levelIndex)`.

- [ ] **Step 1: Write failing schema validation test**

```js
test('all six chapters have sourced learning content', () => {
  assert.equal(CASE_CHAPTERS.length, 6);
  for (const chapter of CASE_CHAPTERS) {
    assert.equal(typeof chapter.briefing.title, 'string');
    assert.ok(chapter.briefing.title.length > 0);
    assert.ok(chapter.learning.fact.length > 0);
    assert.ok(chapter.learning.sourceId.length > 0);
    assert.equal(KNOWLEDGE_SOURCES[chapter.learning.sourceId].reviewStatus, 'reviewed');
  }
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/content-validation.test.cjs`

Expected: FAIL because `js/case-content.js` does not exist.

- [ ] **Step 3: Define source metadata**

```js
const KNOWLEDGE_SOURCES = {
  medline_blood: {
    title: 'Blood',
    organization: 'MedlinePlus, U.S. National Library of Medicine',
    url: 'https://medlineplus.gov/blood.html',
    accessed: '2026-07-26',
    reviewStatus: 'reviewed',
  },
  nhlbi_blood_tests: {
    title: 'Blood Tests',
    organization: 'National Heart, Lung, and Blood Institute',
    url: 'https://www.nhlbi.nih.gov/health/blood-tests',
    accessed: '2026-07-26',
    reviewStatus: 'reviewed',
  },
  niaid_immune_overview: {
    title: 'Overview of the Immune System',
    organization: 'National Institute of Allergy and Infectious Diseases',
    url: 'https://pubweb-prod.niaid.nih.gov/research/immune-system-overview',
    accessed: '2026-07-26',
    reviewStatus: 'reviewed',
  },
  who_sepsis: {
    title: 'Sepsis',
    organization: 'World Health Organization',
    url: 'https://www.who.int/news-room/fact-sheets/detail/sepsis',
    accessed: '2026-07-26',
    reviewStatus: 'reviewed',
  },
};
```

- [ ] **Step 4: Define exact chapter structure**

Each chapter includes:

```js
{
  id: 'blood-circulation',
  levelIndex: 0,
  patientStateBefore: '患者手臂擦伤后，局部组织供氧开始下降。',
  briefing: {
    title: '第一章：运输警报',
    objective: '向受伤组织完成氧气运输，并观察感染变化。',
    doctorLine: '先恢复组织供氧，免疫系统才能维持有效应答。',
  },
  learning: {
    objective: '理解红细胞负责从肺部向组织运输氧气。',
    fact: '红细胞把氧气从肺部输送到身体其他部位。',
    sourceId: 'nhlbi_blood_tests',
    question: {
      prompt: '当前组织缺氧，最直接的优先任务是什么？',
      choices: ['恢复氧气运输', '只追求击杀数量'],
      correctIndex: 0,
      explanation: '本病例的胜负由患者氧供和组织活性决定，而不是击杀分数。',
    },
  },
  outcome: '受伤组织重新获得氧气，但感染信号仍在增强。',
}
```

Repeat with unique content for all six chapters; no chapter may reuse the same learning objective.

- [ ] **Step 5: Implement content validator**

The script exits nonzero when:

- chapter count is not six.
- duplicate chapter IDs exist.
- source is missing or not reviewed.
- URL is not HTTPS.
- briefing/outcome is empty.
- question has fewer than two choices.
- correct index is invalid.
- forbidden placeholder strings appear.

- [ ] **Step 6: Add package script**

```json
{
  "scripts": {
    "validate:content": "node scripts/validate-content.cjs"
  }
}
```

- [ ] **Step 7: Run validation**

Run:

```powershell
node --test tests/content-validation.test.cjs
npm run validate:content
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add js/case-content.js scripts/validate-content.cjs tests/content-validation.test.cjs index.html package.json
git commit -m "content: add sourced six-chapter patient story"
```

### Task 2: Case briefing and chapter transition flow

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/game.js:1220-1370`
- Modify: `js/game.js:1994-2117`
- Create: `tests/story-flow.spec.js`

**Interfaces:**
- Consumes: `getCaseChapter(levelIndex)`.
- Produces: `showCaseBriefing(chapter)`, `showChapterTransition(chapter, report)`.

- [ ] **Step 1: Write failing briefing test**

Start level one and assert the overlay contains:

- chapter title.
- patient state.
- objective.
- doctor line.
- “跳过” and “开始病例”.
- education disclaimer.

- [ ] **Step 2: Add semantic briefing markup**

Use a modal with `role="dialog"`, `aria-modal="true"`, labelled title and focus trap. Buttons must be reachable by Tab and Enter.

- [ ] **Step 3: Implement briefing state**

Before gameplay:

```js
Game.state = 'briefing';
Game.caseBriefingOpenedAt = performance.now();
```

On start:

- add briefing duration to `levelStartTime`.
- set state to `playing`.
- request AI phase one.
- focus `#game-container`.

- [ ] **Step 4: Add chapter transition**

After report confirmation, show:

```text
上一章结果
→ 患者指标变化
→ 下一章威胁
→ 一条经过来源复核的知识结论
```

Do not auto-start the next level; return to chapter selection after acknowledgement.

- [ ] **Step 5: Respect skip and reduced motion**

Persist:

```js
cellQuest_storyPreferences = {
  skipSeenBriefings: false,
  reducedMotion: false
}
```

Skipping hides animation, not objective copy.

- [ ] **Step 6: Run tests**

Run: `npx playwright test tests/story-flow.spec.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add index.html css/style.css js/game.js tests/story-flow.spec.js
git commit -m "feat: add continuous patient chapter flow"
```

### Task 3: Knowledge decisions that affect preparation

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/case-engine.js`
- Modify: `js/game.js`
- Modify: `tests/story-flow.spec.js`

**Interfaces:**
- Consumes: `chapter.learning.question`.
- Produces: `CaseEngine.applyPreparednessBonus(type)`, stored answer record.

- [ ] **Step 1: Write failing knowledge decision test**

Choose the correct transport priority. Assert:

```js
expect(snapshot.modifiers.preparedness).toBe('oxygen');
expect(snapshot.vitals.oxygen).toBe(initialOxygen + 5);
```

Choose the wrong answer in a second test and assert no vital penalty and an explanation is shown.

- [ ] **Step 2: Add answer UI**

Render shuffled visual order but preserve stable answer IDs. Disable choices after selection and show the explanation plus source link.

- [ ] **Step 3: Implement bounded bonuses**

Only allow:

```js
const PREPAREDNESS_BONUSES = {
  oxygen: { oxygen: 5 },
  infection: { infection: -5 },
  atp: { atp: 5 },
};
```

Apply once per case. Wrong answers never reduce patient state.

- [ ] **Step 4: Record learning evidence**

Store in case report:

```js
learning: {
  questionId,
  selectedIndex,
  correct,
  sourceId,
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npx playwright test tests/story-flow.spec.js
npx playwright test tests/case-engine.spec.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add index.html css/style.css js/case-engine.js js/game.js tests/story-flow.spec.js
git commit -m "feat: connect health knowledge to case preparation"
```

### Task 4: Patient-state audiovisual feedback

**Files:**
- Modify: `css/style.css`
- Modify: `js/game.js:917-1037`
- Modify: `js/game.js:1038-1220`
- Modify: `js/config.js`
- Add: `audio/vital-warning.mp3`
- Add: `audio/oxygen-delivery.mp3`
- Add: `audio/infection-cleared.mp3`
- Test: `tests/story-flow.spec.js`

**Interfaces:**
- Consumes: transitions between vital bands.
- Produces: `getVitalBand(snapshot)`, one-shot audiovisual cues.

- [ ] **Step 1: Write failing band transition test**

Assert:

- oxygen crossing below 35 produces one warning event.
- remaining below 35 for 120 frames does not replay it.
- recovering above 45 resets the latch.

- [ ] **Step 2: Implement hysteresis**

Use separate enter/exit thresholds to prevent flicker:

```js
const VITAL_BANDS = {
  oxygen: { warningEnter: 35, warningExit: 45 },
  infection: { warningEnter: 70, warningExit: 60 },
  tissue: { criticalEnter: 25, criticalExit: 35 },
};
```

- [ ] **Step 3: Add visual feedback**

- oxygen warning: cool desaturation and tissue target pulse.
- infection warning: restrained red vignette and infection lesion pulse.
- tissue critical: heartbeat line and countdown copy.
- successful delivery/clear: short directional particle stream toward the corresponding HUD bar.

- [ ] **Step 4: Add audio settings**

Persist independent music and effects volume plus mute. Never autoplay before user interaction.

- [ ] **Step 5: Run tests and manual audio check**

Run: `npx playwright test tests/story-flow.spec.js`

Expected: PASS. Manually verify no warning sound loops.

- [ ] **Step 6: Commit**

```powershell
git add css/style.css js/game.js js/config.js audio/vital-warning.mp3 audio/oxygen-delivery.mp3 audio/infection-cleared.mp3 tests/story-flow.spec.js
git commit -m "feat: make patient deterioration readable"
```

### Task 5: Final immune collaboration report and theme ending

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/game.js:1994-2117`
- Modify: `js/case-content.js`
- Modify: `tests/story-flow.spec.js`

**Interfaces:**
- Consumes: all six saved case reports.
- Produces: `buildCampaignReport()`, final ending overlay.

- [ ] **Step 1: Write failing campaign ending test**

Mark all six official cases complete and assert:

- patient before/after summary.
- total oxygen deliveries.
- total infection sites cleared.
- AI decision count.
- knowledge accuracy.
- final theme statement.

- [ ] **Step 2: Persist compact case reports**

Save only bounded summary data:

```js
caseReports[levelIndex] = {
  version: 1,
  completedAt,
  finalVitals,
  oxygenDeliveries,
  infectionSitesCleared,
  atpEfficiency,
  deaths,
  aiEvents: [{ eventId, source, outcome }],
  learning: { questionId, correct },
};
```

- [ ] **Step 3: Build campaign aggregation**

`buildCampaignReport()` sums counts, computes averages and identifies the most improved patient indicator. It must tolerate missing older reports.

- [ ] **Step 4: Render ending**

End with:

> 人体健康不是某一个细胞的胜利，而是氧气运输、防御和免疫记忆共同协作的结果。

Then show “再次挑战病例”“创建病例”“查看知识图鉴” actions.

- [ ] **Step 5: Run tests**

Run: `npx playwright test tests/story-flow.spec.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add index.html css/style.css js/game.js js/case-content.js tests/story-flow.spec.js
git commit -m "feat: add immune collaboration campaign ending"
```

### Task 6: First-player comprehension validation

**Files:**
- Create: `docs/qa/new-player-playtest.md`
- Modify: `js/case-content.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: observations from at least five first-time players.
- Produces: evidence-backed copy and pacing adjustments.

- [ ] **Step 1: Prepare the fixed interview script**

Ask each player without coaching:

1. 当前患者出了什么问题？
2. 你控制的细胞负责什么？
3. 怎样才算通关？
4. AI刚才改变了什么？
5. 这关教会了你什么？

- [ ] **Step 2: Record structured observations**

For each participant record:

- time to first correct action.
- number of incorrect objective attempts.
- whether they noticed all three vitals.
- answers to the five questions.
- one direct usability quote with consent.

- [ ] **Step 3: Apply only repeated findings**

Change copy or feedback only when at least two participants hit the same problem. Record before/after wording in the QA document.

- [ ] **Step 4: Re-test one new participant**

Success criterion: the participant correctly answers questions 1–4 and completes the tutorial case without external explanation.

- [ ] **Step 5: Commit**

```powershell
git add docs/qa/new-player-playtest.md js/case-content.js css/style.css
git commit -m "ux: refine case comprehension from playtests"
```
