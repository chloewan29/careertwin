# Human Alignment Benchmark Format

Use [`human-alignment-benchmark.template.json`](/c:/Users/chloe/SandboxProjects/careertwin/scripts/fixtures/human-alignment-benchmark.template.json) as the starting point for the real labelled set.

Each job case requires:

- `id`
- `title`
- `human_label`: `high_fit`, `medium_fit`, or `low_fit`
- `human_reasoning_short`
- `source`

Supported `source` types:

- `inline`: embed `job_description`
- `file`: local `job_description_file`
- `snapshot`: existing `job_snapshot_id`
- `interaction`: existing `interaction_id`
- `lookup`: `job_title` plus optional `company`

Run the benchmark with:

```bash
npx tsx scripts/human-alignment-benchmark.ts --careerId <career-id> --profileId <profile-id> --fixture <path-to-json> --out tmp-human-alignment-benchmark.json
```

The output now includes:

- `baseline_v1`
- `before_v2` with transferable-pattern aggregation disabled
- `improved_v2`
- `promoted_cases`
- `guardrails`
