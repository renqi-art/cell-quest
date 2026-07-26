// Tests for AI Case Director contract
const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const {
  validateDirectorRequest,
  validateDirectorPlan,
  createLocalPlan,
  buildPresetPlan,
  hashSeed,
  EVENT_IDS,
} = require('../server/director');

const validRequest = {
  schemaVersion: 1,
  levelId: 'level_test_1',
  mode: 'single',
  primaryCell: 'rbc',
  phase: 1,
  runId: 'test-run-001',
  vitals: { oxygen: 60, infection: 30, tissue: 70 },
  performance: { deaths: 1, elapsedMs: 30000 },
  allowedEvents: ['ACUTE_HYPOXIA', 'INFECTION_REBOUND'],
  validTargetNodes: ['tissue_0', 'infection_1'],
};

describe('Director Request Validation', () => {
  it('accepts a valid bounded request', () => {
    const result = validateDirectorRequest(validRequest);
    assert.equal(result.ok, true);
    assert.equal(result.value.allowedEvents.length, 2);
    assert.equal(result.value.validTargetNodes.length, 2);
  });

  it('rejects missing schemaVersion', () => {
    const req = { ...validRequest, schemaVersion: undefined };
    const result = validateDirectorRequest(req);
    assert.equal(result.ok, false);
  });

  it('rejects wrong schemaVersion', () => {
    const result = validateDirectorRequest({ ...validRequest, schemaVersion: 2 });
    assert.equal(result.ok, false);
  });

  it('rejects invalid mode', () => {
    const result = validateDirectorRequest({ ...validRequest, mode: 'invalid' });
    assert.equal(result.ok, false);
  });

  it('rejects invalid primaryCell', () => {
    const result = validateDirectorRequest({ ...validRequest, primaryCell: 'platelet' });
    assert.equal(result.ok, false);
  });

  it('rejects invalid phase', () => {
    const result = validateDirectorRequest({ ...validRequest, phase: 3 });
    assert.equal(result.ok, false);
  });

  it('rejects unknown events', () => {
    const result = validateDirectorRequest({ ...validRequest, allowedEvents: ['RUN_JAVASCRIPT'] });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('Unknown'));
  });

  it('rejects empty allowedEvents', () => {
    const result = validateDirectorRequest({ ...validRequest, allowedEvents: [] });
    assert.equal(result.ok, false);
  });

  it('rejects invalid target node format', () => {
    const result = validateDirectorRequest({ ...validRequest, validTargetNodes: ['<script>'] });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('target'));
  });

  it('rejects empty validTargetNodes', () => {
    const result = validateDirectorRequest({ ...validRequest, validTargetNodes: [] });
    assert.equal(result.ok, false);
  });

  it('rejects invalid vital values', () => {
    const result = validateDirectorRequest({ ...validRequest, vitals: { oxygen: 150 } });
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('vital'));
  });

  it('accepts missing vitals (optional)', () => {
    const req = { ...validRequest, vitals: undefined };
    const result = validateDirectorRequest(req);
    assert.equal(result.ok, true);
  });

  it('extends vitals values to string check', () => {
    const result = validateDirectorRequest({ ...validRequest, vitals: { oxygen: 'abc' } });
    assert.equal(result.ok, false);
  });
});

describe('Director Plan Validation', () => {
  it('accepts a valid plan', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 2, validRequest);
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, true);
  });

  it('rejects event not in allowedEvents', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    // Change allowedEvents to exclude it
    const req = { ...validRequest, allowedEvents: ['INFECTION_REBOUND'] };
    const result = validateDirectorPlan(plan, req);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('allowedEvents'));
  });

  it('rejects targetNode not in validTargetNodes', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'evil_node', 1, validRequest);
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('targetNode'));
  });

  it('rejects severity 0', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.severity = 0;
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('severity'));
  });

  it('rejects severity 4', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.severity = 4;
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
  });

  it('rejects deadline 29', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.goal.timeLimitSeconds = 29;
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
  });

  it('rejects deadline 61', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.goal.timeLimitSeconds = 61;
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
  });

  it('rejects HTML in doctorLine', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.doctorLine = '<script>alert(1)</script>';
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('unsafe'));
  });

  it('rejects script in doctorLine', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.doctorLine = '<iframe src="x">';
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
  });

  it('rejects extra top-level keys', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.evilKey = 'injected';
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('Unknown'));
  });

  it('rejects goal oxygenDeliveries 0', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.goal.oxygenDeliveries = 0;
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
  });

  it('rejects goal oxygenDeliveries 4', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.goal.oxygenDeliveries = 4;
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
  });

  it('rejects extra goal keys', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    plan.goal.evilField = 'x';
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, false);
  });

  it('accepts plan with missing optional goal fields', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    delete plan.goal.timeLimitSeconds;
    delete plan.goal.infectionSites;
    const result = validateDirectorPlan(plan, validRequest);
    assert.equal(result.ok, true);
  });

  it('accepts coop mode request', () => {
    const req = { ...validRequest, mode: 'coop', primaryCell: 'wbc' };
    const result = validateDirectorRequest(req);
    assert.equal(result.ok, true);
  });
});

describe('Local Director', () => {
  it('produces deterministic output for same seed', () => {
    const plan1 = createLocalPlan(validRequest);
    const plan2 = createLocalPlan(validRequest);
    assert.equal(plan1.eventId, plan2.eventId);
    assert.equal(plan1.targetNode, plan2.targetNode);
    assert.equal(plan1.severity, plan2.severity);
  });

  it('produces different output for different seeds', () => {
    const plan1 = createLocalPlan({ ...validRequest, phase: 1 });
    const plan2 = createLocalPlan({ ...validRequest, phase: 2 });
    // At least one field should differ
    const differs = plan1.eventId !== plan2.eventId ||
      plan1.targetNode !== plan2.targetNode ||
      plan1.severity !== plan2.severity;
    assert.ok(differs, 'Plans should differ for different phases');
  });

  it('selects only from allowedEvents', () => {
    const plan = createLocalPlan({ ...validRequest, allowedEvents: ['TRANSPORT_BLOCKAGE', 'ATP_CRISIS'] });
    assert.ok(['TRANSPORT_BLOCKAGE', 'ATP_CRISIS'].includes(plan.eventId));
  });

  it('selects only from validTargetNodes', () => {
    const plan = createLocalPlan({ ...validRequest, validTargetNodes: ['node_a', 'node_b'] });
    assert.ok(['node_a', 'node_b'].includes(plan.targetNode));
  });

  it('severity is always 1-3', () => {
    for (let i = 0; i < 50; i++) {
      const plan = createLocalPlan({ ...validRequest, runId: `seed_${i}` });
      assert.ok(plan.severity >= 1 && plan.severity <= 3, `severity=${plan.severity} out of range`);
    }
  });

  it('buildPresetPlan produces valid output', () => {
    const plan = buildPresetPlan('INFECTION_REBOUND', 'infection_1', 2, validRequest);
    assert.equal(plan.eventId, 'INFECTION_REBOUND');
    assert.equal(plan.targetNode, 'infection_1');
    assert.equal(plan.severity, 2);
    assert.ok(plan.goal);
    assert.ok(plan.doctorLine);
    assert.ok(plan.reason);
  });

  it('hashSeed is deterministic', () => {
    assert.equal(hashSeed('hello'), hashSeed('hello'));
    assert.notEqual(hashSeed('hello'), hashSeed('world'));
  });
});

describe('Cross-contract: PLAN_KEYS and GOAL_KEYS', () => {
  it('covers all buildPresetPlan output keys', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    const planModule = require('../server/director');
    const planKeys = planModule.PLAN_KEYS;
    for (const key of Object.keys(plan)) {
      assert.ok(planKeys.includes(key), `Missing PLAN_KEY: ${key}`);
    }
  });

  it('covers all buildPresetPlan goal keys', () => {
    const plan = buildPresetPlan('ACUTE_HYPOXIA', 'tissue_0', 1, validRequest);
    const planModule = require('../server/director');
    const goalKeys = planModule.GOAL_KEYS;
    for (const key of Object.keys(plan.goal)) {
      assert.ok(goalKeys.includes(key), `Missing GOAL_KEY: ${key}`);
    }
  });
});
