import { test } from 'node:test';
import * as assert from 'node:assert';
import { buildInterviewEntryBootstrapView, RawJobInteractionRow } from '../../lib/web-adapters/interview-adapter';

test('Interview Adapter: maps applied state to Ready', () => {
    const raw: RawJobInteractionRow = {
        interaction_id: 42,
        job_title: 'Staff Engineer',
        pipeline_status: 'applied'
    };
    
    const view = buildInterviewEntryBootstrapView('job123', raw);
    assert.strictEqual(view.id, 'session_42');
    assert.strictEqual(view.targetRole, 'Staff Engineer');
    assert.strictEqual(view.isReady, true);
    assert.strictEqual(view.ctaLabel, 'Prepare for Interview');
});

test('Interview Adapter: maps synced state to Blocked', () => {
    const raw: RawJobInteractionRow = {
        interaction_id: 42,
        job_title: 'Staff Engineer',
        pipeline_status: 'synced'
    };
    
    const view = buildInterviewEntryBootstrapView('job123', raw);
    assert.strictEqual(view.isReady, false);
    assert.strictEqual(view.ctaLabel, 'Apply First to Enable');
});

test('Interview Adapter: handles null interaction', () => {
    const view = buildInterviewEntryBootstrapView('job123', null);
    assert.strictEqual(view.id, 'session_draft_job123');
    assert.strictEqual(view.isReady, false);
    assert.strictEqual(view.ctaLabel, 'Job Not Found');
});
