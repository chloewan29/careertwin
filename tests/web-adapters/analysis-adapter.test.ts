import { test } from 'node:test';
import * as assert from 'node:assert';
import { buildCapabilityAnalysisView } from '../../lib/web-adapters/capabilities-adapter';
import type { CareerGraph } from '../../lib/career-engine/memory/career-graph-loader';

test('Capability Analysis Adapter: maps valid graph correctly', () => {
    const mockGraph: CareerGraph = {
        career: {
            id: 'c1',
            user_id: 'u1',
            headline: null,
            summary: null,
            total_years_experience: null,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
        experiences: [],
        evidencePieces: [],
        capabilities: [
            {
                id: 'cap1',
                career_id: 'c1',
                name: 'Strategic Leadership',
                normalized_name: 'strategic_leadership',
                scope_summary: 'Leading large teams',
                confidence: 0.9,
                strength: null,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'cap2',
                career_id: 'c1',
                name: 'Data Analysis',
                normalized_name: 'data_analysis',
                scope_summary: 'Crunching numbers',
                confidence: 0.4,
                strength: null,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            }
        ],
        capabilityEvidenceLinks: [],
        evidenceByExperience: {},
        capabilitiesByEvidence: {},
        evidenceByCapability: {
            'cap1': [
                {
                    id: 'ev1',
                    career_id: 'c1',
                    experience_id: 'exp1',
                    company: 'Acme Corp',
                    role: 'Director',
                    date_range: '2020-2022',
                    raw_text: 'Led team of 50',
                    source_type: 'resume_bullet',
                    sort_order: 1,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z'
                }
            ]
        }
    };

    const view = buildCapabilityAnalysisView('user_1', mockGraph);
    
    // Assert Nodes
    assert.strictEqual(view.nodes.length, 2);
    
    const cap1 = view.nodes.find(n => n.id === 'cap1');
    assert.ok(cap1);
    assert.strictEqual(cap1.name, 'Strategic Leadership');
    assert.strictEqual(cap1.validationStatus, 'verified'); // confidence > 0.8
    assert.strictEqual(cap1.evidenceCount, 1);

    const cap2 = view.nodes.find(n => n.id === 'cap2');
    assert.ok(cap2);
    assert.strictEqual(cap2.validationStatus, 'unverified'); // confidence < 0.5
    assert.strictEqual(cap2.evidenceCount, 0);

    // Assert Evidence Map
    assert.ok(view.evidenceMap['cap1']);
    assert.strictEqual(view.evidenceMap['cap1'].length, 1);
    assert.strictEqual(view.evidenceMap['cap1'][0].text, 'Led team of 50');
    assert.strictEqual(view.evidenceMap['cap1'][0].sourceContext, 'Director at Acme Corp');
});

test('Capability Analysis Adapter: maps null graph correctly', () => {
    const view = buildCapabilityAnalysisView('user_1', null);
    assert.strictEqual(view.nodes.length, 0);
    assert.deepStrictEqual(view.evidenceMap, {});
});
