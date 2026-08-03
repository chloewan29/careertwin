import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rootSource = readFileSync("app/page.tsx", "utf8");
const intakeSource = readFileSync("components/career-possibility/ResumeTextIntakeWorkspace.tsx", "utf8");
const reviewSource = readFileSync("components/career-possibility/ResumeEvidenceReviewWorkspace.tsx", "utf8");

assert.match(rootSource, /Your career, replicated\./);
assert.match(rootSource, /CareerTwin turns your experience into a map of transferable capabilities/);
assert.match(rootSource, /<ResumeTextIntakeWorkspace/);
assert.match(rootSource, /entryMode="root"/);
assert.match(rootSource, /navigateToCareerMapOnApply/);
assert.doesNotMatch(rootSource, /Frontend prototype|No backend connection yet|mock only|type="file"|Choose your CV/);
assert.doesNotMatch(rootSource, /Example Career Map|Capabilities into future directions|Mock data preview|Uncover your career map/);
assert.doesNotMatch(rootSource, /href="\/career-map\/resume-intake"/);
assert.match(intakeSource, /extractResumeEvidenceFromText/);
assert.match(intakeSource, /Build my Career Map/);
assert.match(intakeSource, /ResumeEvidenceReviewWorkspace/);
assert.match(intakeSource, /onReviewComplete=\{completeReview\}/);
assert.match(intakeSource, /onApplied=\{navigateToCareerMapOnApply \? \(\) => router\.push\("\/career-map"\)/);
assert.match(intakeSource, /readLocalCareerMapState/);
assert.match(intakeSource, /View current Career Map/);
assert.match(intakeSource, /will replace its current evidence/);
assert.match(reviewSource, /writeLocalCareerMapState/);
assert.match(reviewSource, /Replace the existing imported Career Map evidence\?/);
assert.match(reviewSource, /onApplied\?\.\(\)/);
assert.doesNotMatch(`${rootSource}\n${intakeSource}`, /supplement|append|best fit|job readiness|suitability/i);
assert.equal((`${rootSource}\n${intakeSource}\n${reviewSource}`.match(/careertwin\.local-career-map\.v1/g) ?? []).length, 0);

console.log("root inline intake tests passed");
