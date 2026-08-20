# POST-MVP TASK A
# WORKSPACE PROP CONTRACT REPAIR

## STATUS
- **NON_CANONICAL**
- **POST-MVP TASK A**
- **WORKSPACE PROP CONTRACT REPAIR**

## Original TS2322 Mismatch
```
app/career-map/page.tsx(8,875): error TS2322: Type '{ definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; roles: readonly RoleCapabilityProfile[]; canonicalLibrary: CanonicalCapabilityLibrary; governance: CanonicalCapabilityGovernanceLibrary; }' is not assignable to type 'IntrinsicAttributes & { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; }'.
  Property 'roles' does not exist on type 'IntrinsicAttributes & { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; }'.
```

## Removed Obsolete Props
- `roles`
- `canonicalLibrary`
- `governance`

## Removed Dead Imports
- `representativeGenericRoleProfiles` from `@/lib/career-possibility/generic-role-archetype`
- `canonicalCapabilityGovernanceLibrary` from `@/lib/career-possibility/canonical-capability-governance-decisions`

## Exact Production File Changed
- `app/career-map/page.tsx`

## Verification Gates
- **TypeScript**: PASS
- **ESLint**: PASS
- **Focused Tests**: PASS
- **Build**: PASS

## Semantic Boundary Confirmation
- CareerMapNeuralGraph modified: NO
- Graph projection modified: NO
- Role alignment modified: NO
- Canonical ontology modified: NO
- Inference modified: NO
- Provider/API modified: NO
- Role knowledge modified: NO
- Ranking modified: NO
- HOLD modified: NO

## Next Action
POST_MVP_TASK_A_WORKSPACE_CONTRACT_REPAIRED. Proceed to Implementation Candidate Visual Acceptance.
