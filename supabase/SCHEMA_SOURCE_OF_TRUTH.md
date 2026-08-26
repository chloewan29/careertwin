# Schema Source Of Truth

- executable canonical chain: `supabase/migrations/*`
- canonical baseline: `20260825070000_canonical_application_baseline.sql`
- runtime reconciliation: `20260825080000_reconcile_runtime_schema.sql`
- atomic evidence delta: `20260825090000_add_atomic_evidence_ingestion.sql`
- non-executable historical provenance: `supabase/migration-provenance/*`
- legacy reference only: `supabase/migration.sql`
- legacy reference only: `supabase/migationcodex.sql`

Only the three-file executable chain may be used to construct new local, CI,
preview, or production application schemas. Historical and legacy SQL must not
be replayed or marked applied as substitutes for the canonical baseline.

Auth identities and Storage buckets/objects are platform-managed and are not
owned by the public application-schema baseline.

The application-owned `public` function inventory is exactly
`public.set_updated_at()` with eight dependent update triggers. The historical
count of ten was a line-counting error over one multiline function definition.
The canonical database contract verifies application objects separately from
Supabase/extension-owned catalog objects.

B0 owns the preserved API-role grants and `postgres` public default privileges
for the application chain. RLS remains the row-access boundary where enabled.

See:
- `docs/system_map.md`
- `docs/schema_inventory.md`
- `docs/canonical_schema.md`
