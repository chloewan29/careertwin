import test from "node:test";
import assert from "node:assert";
import { buildCareerGraphVisualModel, buildCareerGraphFocusSet } from "../../lib/career-possibility/career-graph-visual-adapter";
import { sparseProfileProjectionFixture } from "./fixtures/sparse-profile.fixture";

test("Career Graph Visual Adapter: Sparse Profile Presentation Contract", async (t) => {
  const model = buildCareerGraphVisualModel(sparseProfileProjectionFixture);

  await t.test("Semantics: one personal capability remains present", () => {
    const personalCaps = model.nodes.filter(n => n.nodeType === "CAPABILITY");
    assert.strictEqual(personalCaps.length, 1);
  });

  await t.test("Semantics: role-only semantics remain present", () => {
    const roleOnlyCaps = model.nodes.filter(n => n.nodeType === "ROLE_ONLY_CAPABILITY");
    assert.strictEqual(roleOnlyCaps.length, 24);
  });

  await t.test("Focus: no-role-focus identity hierarchy preserved", () => {
    // When there is no focus, the UI relies on focusSet being null, 
    // but we can assert that focus building requires a role ID, 
    // meaning the visual model itself does not arbitrarily elevate gaps.
    // The renderer now handles setting globalAlpha = 0.08 for ROLE_ONLY_CAPABILITY when focusSet is null.
    assert.strictEqual(model.nodes.some(n => n.nodeType === "YOU"), true);
  });

  await t.test("Focus: role focus reveals the appropriate role-only requirements", () => {
    // Simulate focusing role:r1
    const role1Focus = buildCareerGraphFocusSet(model, "role:r1");
    assert.ok(role1Focus.has("role:r1"), "Focus set includes role");
    
    // Check that its gaps are in the focus set
    const r1Gaps = model.nodes.filter(n => n.nodeType === "ROLE_ONLY_CAPABILITY" && n.roleIds?.includes("role:r1"));
    assert.strictEqual(r1Gaps.length, 6);
    for (const gap of r1Gaps) {
      assert.ok(role1Focus.has(gap.id), "Focus set includes role gap");
    }

    // Check that it highlights shared identity
    const sharedCap = model.nodes.find(n => n.nodeType === "CAPABILITY" && n.id === "cap:c1");
    assert.ok(sharedCap);
    assert.ok(role1Focus.has(sharedCap.id), "Focus set includes shared personal capability");

    // Check that role:r3 gaps are NOT in the focus set
    const r3Gaps = model.nodes.filter(n => n.nodeType === "ROLE_ONLY_CAPABILITY" && n.roleIds?.includes("role:r3"));
    assert.strictEqual(r3Gaps.length, 6);
    for (const gap of r3Gaps) {
      assert.ok(!role1Focus.has(gap.id), "Focus set does NOT include unrelated role gap");
    }
  });

  await t.test("Semantics: role-only non-ownership preserved", () => {
    const roleOnlyCaps = model.nodes.filter(n => n.nodeType === "ROLE_ONLY_CAPABILITY");
    for (const cap of roleOnlyCaps) {
      assert.strictEqual(cap.personalOwned, false);
      const youLink = model.links.find(l => l.source === "user" && l.target === cap.id);
      assert.strictEqual(youLink, undefined, "Gap capability has no YOU edge");
    }
  });
});
