import { describe, it, expect, beforeAll } from "vitest";
import { ensureIndexes, getOccupations } from "../../lib/career-possibility/external-taxonomy/esco/esco-index";
import { ensureCrosswalkIndexes } from "../../lib/career-possibility/external-taxonomy/esco/esco-careertwin-crosswalk";
import { getRoleCapabilityProjection, getEscoOccupationsForCareerTwinCapability } from "../../lib/career-possibility/external-taxonomy/esco/esco-role-capability-projection";

describe("ESCO Role Capability Projection", () => {
  beforeAll(() => {
    ensureIndexes();
    ensureCrosswalkIndexes();
  });

  it("can project an occupation into capability profile", () => {
    const occs = getOccupations();
    const sampleUri = occs[0].uri;
    const proj = getRoleCapabilityProjection(sampleUri);
    expect(proj).toBeDefined();
    if (proj) {
      expect(proj.occupationUri).toBe(sampleUri);
      expect(Array.isArray(proj.capabilities)).toBe(true);
      // verify deduplication implicitly since map aggregates by capabilityId
      const ids = proj.capabilities.map(c => c.capabilityId);
      expect(new Set(ids).size).toBe(ids.length);
      
      // Check deterministic ordering
      for (let i = 1; i < proj.capabilities.length; i++) {
        const prev = proj.capabilities[i-1];
        const curr = proj.capabilities[i];
        if (prev.supportClass === curr.supportClass) {
          if (prev.essentialSupportCount === curr.essentialSupportCount) {
             if (prev.optionalSupportCount === curr.optionalSupportCount) {
                expect(prev.capabilityId.localeCompare(curr.capabilityId)).toBeLessThanOrEqual(0);
             } else {
                expect(prev.optionalSupportCount).toBeGreaterThanOrEqual(curr.optionalSupportCount);
             }
          } else {
             expect(prev.essentialSupportCount).toBeGreaterThanOrEqual(curr.essentialSupportCount);
          }
        } else {
          expect(prev.supportClass).toBe("essential_backed");
          expect(curr.supportClass).toBe("optional_only");
        }
      }
    }
  });

  it("can reverse lookup capabilities", () => {
     // use the mock id "team_leadership"
     const occs = getEscoOccupationsForCareerTwinCapability("team_leadership");
     expect(Array.isArray(occs)).toBe(true);
  });
});
