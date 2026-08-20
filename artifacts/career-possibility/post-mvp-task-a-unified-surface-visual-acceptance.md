# POST-MVP TASK A
# UNIFIED CAREER MAP IMPLEMENTATION CANDIDATE
# VISUAL ACCEPTANCE

## STATUS
- **NON_CANONICAL**
- **POST-MVP TASK A**
- **UNIFIED CAREER MAP IMPLEMENTATION CANDIDATE**
- **VISUAL ACCEPTANCE**
- **NO PRODUCTION WRITE**

## Exact Candidate Diff
```
 components/career-possibility/LocalCareerMapWorkspace.tsx | 20 +++---
 tests/career-possibility/post-upload-career-map-simplification.test.ts | 4 +-
 tests/career-possibility/root-inline-intake.test.ts | 2 +-
 tests/career-possibility/unified-career-map-surface.test.ts | 33 +++++++++
```

## Tests / Build Verification
- **Targeted Tests**: Passed (3/3)
- **`npx tsc --noEmit`**: **FAILED**
  - **Output**:
    ```
    app/career-map/page.tsx(8,875): error TS2322: Type '{ definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; roles: readonly RoleCapabilityProfile[]; canonicalLibrary: CanonicalCapabilityLibrary; governance: CanonicalCapabilityGovernanceLibrary; }' is not assignable to type 'IntrinsicAttributes & { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; }'.
      Property 'roles' does not exist on type 'IntrinsicAttributes & { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; }'.
    ```
- **Explanation**: The candidate modifications to `components/career-possibility/LocalCareerMapWorkspace.tsx` removed the `roles`, `canonicalLibrary`, and `governance` props from its interface because they were only needed for the deprecated tab structures. However, `app/career-map/page.tsx` was correctly reverted to HEAD during boundary recovery and is still passing those props, causing a type definition mismatch.

*Due to the hard build failure, the verification stopped early before capturing visual validations.*

## Family Node Inventory
N/A - Blocked by build failure

## Capability Inventory
N/A - Blocked by build failure

## Two-Layer Topology
N/A - Blocked by build failure

## Geometry Classification
N/A - Blocked by build failure

## Founder Screenshot Test
N/A - Blocked by build failure

## Role Inventory
N/A - Blocked by build failure

## Shared/Gap Result
N/A - Blocked by build failure

## Evidence Interaction
N/A - Blocked by build failure

## Mobile Result
N/A - Blocked by build failure

## Overflow/Collision Result
N/A - Blocked by build failure

## Screenshots
N/A - Blocked by build failure

## Product Judgment
VERIFICATION_FAILED

## First Writable Owner (If Failed)
`components/career-possibility/LocalCareerMapWorkspace.tsx` (interface definitions) or `app/career-map/page.tsx` (invocation).

## Exact Next Action
Apply one bounded presentation repair to correctly align the parent prop contract with the child workspace component.
