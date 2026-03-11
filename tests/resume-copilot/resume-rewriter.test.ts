import { strict as assert } from "node:assert";
import { MAX_BULLET_CHAR_LENGTH, rewriteBulletWithCompaction } from "@/lib/career-engine/copilot/resume-copilot/resume-rewriter";

const labeled = "Commercial & Revenue Impact: Responsible for pricing and margin analysis across business units.";
const rewrittenLabeled = rewriteBulletWithCompaction(labeled);
assert.ok(!rewrittenLabeled.rewrittenBullet.toLowerCase().startsWith("commercial & revenue impact"));
assert.ok(rewrittenLabeled.rewrittenBullet.startsWith("Managed"));

const responsibilities = "Roles and Responsibilities: Worked on stakeholder governance and roadmap planning.";
const rewrittenResponsibilities = rewriteBulletWithCompaction(responsibilities);
assert.ok(!rewrittenResponsibilities.rewrittenBullet.toLowerCase().startsWith("roles and responsibilities"));
assert.ok(rewrittenResponsibilities.rewrittenBullet.startsWith("Contributed to"));

const longParagraph = "Highlights: Delivered cross-functional transformation program across multiple teams with governance, operating model updates, and change rollout. Coordinated planning, risk management, and reporting cadence with stakeholders over several quarters.";
const rewrittenLong = rewriteBulletWithCompaction(longParagraph);
assert.ok(rewrittenLong.rewrittenBullet.length > 0);
assert.ok(rewrittenLong.rewrittenLength <= MAX_BULLET_CHAR_LENGTH + 1);

const truncationRegression = "Commercial & Revenue Impact: Led $5M revenue gap closure through portfolio reprioritization, governance cadence, and stakeholder alignment across commercial teams.";
const rewrittenRegression = rewriteBulletWithCompaction(truncationRegression);
assert.ok(!rewrittenRegression.rewrittenBullet.endsWith("through."));
assert.ok(!/\b(by|through|using|including)\.$/i.test(rewrittenRegression.rewrittenBullet));
assert.ok(rewrittenRegression.rewrittenBullet.includes("$5M revenue gap closure"));
assert.ok(/through|governance|stakeholder/i.test(rewrittenRegression.rewrittenBullet), "Expected business context to be retained");

const sparseRegression = "Pioneered AI-powered analytics automation using Google BigQuery, Power BI, and LLMs to generate automated executive-level insights for NPS redesign program.";
const rewrittenSparse = rewriteBulletWithCompaction(sparseRegression);
assert.ok(/using/i.test(rewrittenSparse.rewrittenBullet), "Expected platform/context clause to be retained");
assert.ok(/bigquery|power bi|llm/i.test(rewrittenSparse.rewrittenBullet.toLowerCase()), "Expected platform details to be retained");

const productPrioritization = "Led product prioritization using impact-based framework, conducted client interviews, and reprioritized features based on effort-to-impact trade-offs.";
const rewrittenProduct = rewriteBulletWithCompaction(productPrioritization);
assert.ok(/framework|client interviews|reprioritized/i.test(rewrittenProduct.rewrittenBullet.toLowerCase()), "Expected object and business context to be retained");

console.log("resume-rewriter.test passed");
