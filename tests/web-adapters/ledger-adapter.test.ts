import { test } from 'node:test';
import * as assert from 'node:assert';
import { buildLedgerListView, RawLedgerData } from '../../lib/web-adapters/ledger-adapter';

test('Ledger Adapter: maps interactions correctly', () => {
    const raw: RawLedgerData = {
        interactions: [
            {
                interaction_id: 1,
                job_snapshot_id: 100,
                pipeline_status: 'applied',
                first_seen_at: '2025-01-01T00:00:00.000Z',
                match_score: 85,
                verdict: 'strong_fit'
            },
            {
                interaction_id: 2,
                job_snapshot_id: 101,
                pipeline_status: 'synced',
                first_seen_at: '2025-01-02T00:00:00.000Z',
                match_score: 50,
                verdict: 'stretch'
            }
        ],
        snapshots: [
            { job_snapshot_id: 100, job_title: 'Senior Engineer', company: 'Google' },
            { job_snapshot_id: 101, job_title: 'Manager', company: 'Meta' }
        ]
    };

    const view = buildLedgerListView('user_1', raw);
    assert.strictEqual(view.totalCount, 2);
    
    assert.strictEqual(view.items[0].title, 'Senior Engineer');
    assert.strictEqual(view.items[0].company, 'Google');
    assert.strictEqual(view.items[0].status, 'applied');
    assert.strictEqual(view.items[0].matchScore, 85);
    assert.strictEqual(view.items[0].fitLabel, 'Strong Fit');

    assert.strictEqual(view.items[1].title, 'Manager');
    assert.strictEqual(view.items[1].company, 'Meta');
    assert.strictEqual(view.items[1].status, 'analyzed'); // synced + has match score = analyzed
    assert.strictEqual(view.items[1].matchScore, 50);
    assert.strictEqual(view.items[1].fitLabel, 'Stretch');
});
