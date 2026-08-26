# Pre-canonical migration provenance

These migrations are preserved unchanged for audit history.

They are intentionally outside `supabase/migrations/` and are therefore not
part of the executable canonical migration chain. They predate the verified
CareerTwin application baseline and cannot reproduce that baseline from an
empty supported Supabase environment.

Do not replay or mark these individual migrations as applied in production.
The executable schema source of truth is `supabase/migrations/*`.
