import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  collectCurrentSourceFacts,
  classifyCapabilitySourceFacts,
  compileCurrentCapabilitySourceCensus,
  isBoilerplate,
  COMPILER_VERSION,
  evaluateCompleteness
} from '../../scripts/career-possibility/source-census-compiler';

const v2Fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/source-census-v2-baseline.json'), 'utf8'));
const wave1Fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/source-census-wave1-postwrite.json'), 'utf8'));

test('TEST 1: Frozen V2 classification replay (51/51)', () => {
  let matched = 0;
  v2Fixture.capabilities.forEach((c: any) => {
    const f = {
      nonBoilerplateExpectedEvidenceCount: c.nonBoilerplateExpectedEvidenceCount,
      richArchetypeUsageCount: c.richArchetypeUsageCount,
      directMappingClueCount: c.directMappingClueCount
    };
    const result = classifyCapabilitySourceFacts(f);
    if (result.sourceSufficiency === c.sourceSufficiency && result.generationRoute === c.generationRoute) {
      matched++;
    }
  });
  assert.equal(matched, 51, 'All 51 V2 capabilities must match classification rule');
});

test('TEST 2: Frozen Wave 1 classification replay (51/51)', () => {
  let matched = 0;
  wave1Fixture.capabilities.forEach((c: any) => {
    const f = {
      nonBoilerplateExpectedEvidenceCount: c.nonBoilerplateExpectedEvidenceCount,
      richArchetypeUsageCount: c.richArchetypeUsageCount,
      directMappingClueCount: c.directMappingClueCount
    };
    const result = classifyCapabilitySourceFacts(f);
    if (result.sourceSufficiency === c.sourceSufficiency && result.generationRoute === c.generationRoute) {
      matched++;
    }
  });
  assert.equal(matched, 51, 'All 51 Wave 1 capabilities must match classification rule');
});

test('TEST 3: Current repository source collection (51 canonical capabilities)', () => {
  const { facts } = collectCurrentSourceFacts();
  assert.equal(facts.size, 51, 'Must collect 51 canonical capabilities');
});

test('TEST 4: Current repository role topology', () => {
  const { topology } = collectCurrentSourceFacts();
  assert.equal(topology.genericArchetypes, 4, '4 Generic Archetypes');
  assert.equal(topology.seededProfiles, 18, '18 seeded profiles');
  assert.equal(topology.genericRelationships, 26, '26 generic relationships');
  assert.equal(topology.seededRelationships, 72, '72 seeded relationships');
  assert.equal(topology.totalRelationships, 98, '98 total relationships');
  assert.equal(topology.canonicalRelationships, 73, '73 canonical relationships');
  assert.equal(topology.totalRelationships - topology.canonicalRelationships, 25, '25 private relationships');
});

test('TEST 5 (A/B): Classifier Replay and Current Semantic State (51/51)', () => {
  const census = compileCurrentCapabilitySourceCensus();
  let matched = 0;
  
  census.capabilities.forEach((current: any) => {
    const frozen = wave1Fixture.capabilities.find((c: any) => c.capabilityId === current.capabilityId);
    assert.ok(frozen, `Missing capability ${current.capabilityId} in fixture`);
    
    // Sufficiency and Routing (Classifier outputs)
    assert.equal(current.sourceSufficiency, frozen.sourceSufficiency, `Sufficiency mismatch on ${current.capabilityId}`);
    assert.equal(current.generationRoute, frozen.generationRoute, `Route mismatch on ${current.capabilityId}`);
    
    // Raw facts (with erratum for people-leadership)
    assert.equal(current.richArchetypeUsageCount, frozen.richArchetypeUsageCount, `Archetype count mismatch on ${current.capabilityId}`);
    
    if (current.capabilityId === 'people-leadership') {
      // HISTORICAL RAW-FACT ERRATUM TEST
      assert.equal(frozen.nonBoilerplateExpectedEvidenceCount, 1, 'Historical bug: frozen erroneously claimed 1 non-boilerplate');
      assert.equal(current.nonBoilerplateExpectedEvidenceCount, 0, 'Current correctly classifies alias template as boilerplate (0)');
      assert.equal(frozen.seededUsageCount, 2, 'Historical bug: frozen had 2 seeded usages');
      assert.equal(current.seededUsageCount, 2, 'Current correctly finds 2 seeded usages');
    } else {
      assert.equal(current.seededUsageCount, frozen.seededUsageCount, `Seeded count mismatch on ${current.capabilityId}`);
      assert.equal(current.nonBoilerplateExpectedEvidenceCount, frozen.nonBoilerplateExpectedEvidenceCount, `Non-boilerplate count mismatch on ${current.capabilityId}`);
    }
    
    assert.equal(current.mappingClueCount, frozen.mappingClueCount, `Mapping clue count mismatch on ${current.capabilityId}`);
    assert.equal(current.evidenceSignalClueCount, frozen.evidenceSignalClueCount, `Evidence clue count mismatch on ${current.capabilityId}`);

    matched++;
  });
  
  assert.equal(matched, 51, 'All 51 capabilities must match current source semantic state to Wave 1 postwrite (with errata)');
});

test('TEST 5D: Current Diagnostic Contract Tests', () => {
  const census = compileCurrentCapabilitySourceCensus();
  
  census.capabilities.forEach((current: any) => {
    // Current compiler does not claim unprovable semanticDrift
    assert.equal(current.semanticDrift, 'NOT_EVALUATED', `Current compiler must not emit CONSISTENT blindly for ${current.capabilityId}`);
    
    // Current compilerCompleteness is genuinely derived
    assert.ok(current.compilerCompleteness === 'COMPLETE' || current.compilerCompleteness === 'INCOMPLETE', `Compiler completeness must be derived for ${current.capabilityId}`);
  });
});

test('TEST 6: Wave 1 movement regression (exactly 10 capabilities changed)', () => {
  let changed = 0;
  wave1Fixture.capabilities.forEach((wave1: any) => {
    const v2 = v2Fixture.capabilities.find((c: any) => c.capabilityId === wave1.capabilityId);
    if (wave1.sourceSufficiency !== v2.sourceSufficiency) {
      changed++;
    }
  });
  assert.equal(changed, 10, 'Exactly 10 capabilities should have changed sufficiency');
});

test('TEST 7: 10 movement records are exactly INSUFFICIENT -> WEAK, ONTOLOGY_ENRICHMENT_REQUIRED -> TARGETED_REVIEW_CANDIDATE', () => {
  const targets = new Set([
    'workforce-advisory', 'employee-relations', 'organisation-design', 'talent-planning',
    'account-growth', 'consultative-selling', 'pipeline-management', 'commercial-negotiation',
    'operating-control', 'service-performance'
  ]);
  
  targets.forEach(t => {
    const wave1 = wave1Fixture.capabilities.find((c: any) => c.capabilityId === t);
    const v2 = v2Fixture.capabilities.find((c: any) => c.capabilityId === t);
    
    assert.equal(v2.sourceSufficiency, 'INSUFFICIENT');
    assert.equal(wave1.sourceSufficiency, 'WEAK');
    assert.equal(v2.generationRoute, 'ONTOLOGY_ENRICHMENT_REQUIRED');
    assert.equal(wave1.generationRoute, 'TARGETED_REVIEW_CANDIDATE');
  });
});

test('TEST 8: 41 non-target capability semantic states remain unchanged', () => {
  const targets = new Set([
    'workforce-advisory', 'employee-relations', 'organisation-design', 'talent-planning',
    'account-growth', 'consultative-selling', 'pipeline-management', 'commercial-negotiation',
    'operating-control', 'service-performance'
  ]);
  
  let unchangedCount = 0;
  wave1Fixture.capabilities.forEach((wave1: any) => {
    if (!targets.has(wave1.capabilityId)) {
      const v2 = v2Fixture.capabilities.find((c: any) => c.capabilityId === wave1.capabilityId);
      assert.equal(wave1.sourceSufficiency, v2.sourceSufficiency);
      unchangedCount++;
    }
  });
  assert.equal(unchangedCount, 41, '41 non-targets must remain unchanged');
});

test('TEST 9: Existing 18 AUTO population has zero regression', () => {
  let autoCount = 0;
  wave1Fixture.capabilities.forEach((wave1: any) => {
    const v2 = v2Fixture.capabilities.find((c: any) => c.capabilityId === wave1.capabilityId);
    if (v2.generationRoute === 'AUTO_GENERATION_CANDIDATE') {
      assert.equal(wave1.generationRoute, 'AUTO_GENERATION_CANDIDATE', 'Auto generation route must not regress');
      autoCount++;
    }
  });
  assert.equal(autoCount, 18, '18 AUTO candidates must exist');
});

test('TEST 10: Boilerplate detector tests', () => {
  // Test boilerplate detection logic via the collectCurrentSourceFacts helper implicitly, 
  // or export it to test explicitly. The current implementation implicitly proves it works via Test 5.
  const { facts } = collectCurrentSourceFacts();
  const accGrowth = facts.get('account-growth');
  assert.equal(accGrowth.nonBoilerplateExpectedEvidenceCount, 1, 'Relationship specific evidence must be non-boilerplate');
  assert.equal(accGrowth.boilerplateExpectedEvidenceCount, 0, 'No boilerplate expected');
  
  const resourcePlanning = facts.get('resource-planning');
  if (resourcePlanning) {
    assert.equal(resourcePlanning.boilerplateExpectedEvidenceCount, 1, 'Template evidence must be boilerplate');
  }
  
  // A. canonical label template -> BOILERPLATE
  assert.strictEqual(isBoilerplate("A concrete example showing applied canonical label."), true);
  
  // B. relationship-label alias template -> BOILERPLATE
  assert.strictEqual(isBoilerplate("A specific owned outcome demonstrating some weird alias label."), true);
  
  // C. case variation -> BOILERPLATE
  assert.strictEqual(isBoilerplate("a CoNcReTe exaMPle showING applied case variation."), true);
  
  // D. trivial punctuation/whitespace variation -> BOILERPLATE
  assert.strictEqual(isBoilerplate("  a concrete example showing applied whitespace.  "), true);
  
  // E. owned-outcome template using relationship label -> BOILERPLATE
  assert.strictEqual(isBoilerplate("A specific owned outcome demonstrating relationship label."), true);
  
  // F. genuine observable action + semantic object + outcome/context -> NON_BOILERPLATE
  assert.strictEqual(isBoilerplate("Provided strategic workforce advice to business leadership resulting in a documented change to people practices."), false);
});

test('TEST 11: Dynamic completeness negative tests (Dynamic Count Contract)', () => {
  // valid current source inventory -> COMPLETE
  assert.equal(evaluateCompleteness(true, true, true, true, true, true, true, true), 'COMPLETE', 'All required classes loaded -> COMPLETE');
  
  // missing canonical family resolution -> INCOMPLETE
  assert.equal(evaluateCompleteness(true, true, true, true, true, true, false, true), 'INCOMPLETE', 'Missing family reference -> INCOMPLETE');
  
  // missing required source-class availability -> INCOMPLETE
  assert.equal(evaluateCompleteness(false, true, true, true, true, true, true, true), 'INCOMPLETE', 'Missing capability library -> INCOMPLETE');
  assert.equal(evaluateCompleteness(true, false, true, true, true, true, true, true), 'INCOMPLETE', 'Missing family library -> INCOMPLETE');
  assert.equal(evaluateCompleteness(true, true, false, true, true, true, true, true), 'INCOMPLETE', 'Missing archetypes -> INCOMPLETE');
  assert.equal(evaluateCompleteness(true, true, true, false, true, true, true, true), 'INCOMPLETE', 'Missing seeded profiles -> INCOMPLETE');
  
  // unresolved canonical relationship -> INCOMPLETE
  assert.equal(evaluateCompleteness(true, true, true, true, true, true, true, false), 'INCOMPLETE', 'Unresolved canonical ID -> INCOMPLETE');
});
