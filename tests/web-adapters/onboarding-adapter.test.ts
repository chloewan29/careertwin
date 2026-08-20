import { test } from 'node:test';
import * as assert from 'node:assert';
import { buildCvInitializationSummaryView, RawOnboardingData } from '../../lib/web-adapters/onboarding-adapter';

test('Onboarding Adapter: maps empty state correctly', () => {
    const raw: RawOnboardingData = { status: 'empty' };
    const view = buildCvInitializationSummaryView(raw);
    assert.strictEqual(view.success, false);
    assert.strictEqual(view.message, 'Awaiting CV Upload');
    assert.strictEqual(view.extractedCapabilitiesCount, 0);
    assert.strictEqual(view.extractedEvidenceCount, 0);
});

test('Onboarding Adapter: maps processing state correctly', () => {
    const raw: RawOnboardingData = { status: 'processing', capabilities_count: 2 };
    const view = buildCvInitializationSummaryView(raw);
    assert.strictEqual(view.success, false);
    assert.strictEqual(view.message, 'Processing your career memory...');
    assert.strictEqual(view.extractedCapabilitiesCount, 2);
    assert.strictEqual(view.extractedEvidenceCount, 0);
});

test('Onboarding Adapter: maps ready state correctly', () => {
    const raw: RawOnboardingData = { status: 'ready', capabilities_count: 6, evidence_count: 24 };
    const view = buildCvInitializationSummaryView(raw);
    assert.strictEqual(view.success, true);
    assert.strictEqual(view.message, 'Twin Core Synchronized.');
    assert.strictEqual(view.extractedCapabilitiesCount, 6);
    assert.strictEqual(view.extractedEvidenceCount, 24);
});

test('Onboarding Adapter: maps error state correctly', () => {
    const raw: RawOnboardingData = { status: 'error' };
    const view = buildCvInitializationSummaryView(raw);
    assert.strictEqual(view.success, false);
    assert.strictEqual(view.message, 'Extraction failed. Please try again.');
});
