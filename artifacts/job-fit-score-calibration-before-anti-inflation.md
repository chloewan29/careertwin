# Job Fit Score Calibration Audit

## Summary
- Total cases analyzed: 20
- Average score: 58.8
- Median score: 62.2

## Score Distribution
| Range | Count |
| --- | ---: |
| 0-20 | 0 |
| 20-40 | 1 |
| 40-60 | 7 |
| 60-80 | 12 |
| 80-100 | 0 |

## Bucket Distribution
| Bucket | Count |
| --- | ---: |
| Strong Match | 0 |
| Good Match | 12 |
| Partial Match | 6 |
| Weak Match | 2 |

## Specialization vs Score Alignment
| Specialization | Cases | Avg Score | Min | Max | Bucket Distribution |
| --- | ---: | ---: | ---: | ---: | --- |
| product_analytics | 7 | 68.6 | 67.3 | 69.2 | S:0, G:7, P:0, W:0 |
| consumer_insights | 4 | 64.5 | 57.6 | 70.1 | S:0, G:3, P:1, W:0 |
| management_consulting | 3 | 46.5 | 42.1 | 51.2 | S:0, G:0, P:2, W:1 |
| data_analytics | 1 | 62.2 | 62.2 | 62.2 | S:0, G:1, P:0, W:0 |
| audience_analytics | 1 | 62.1 | 62.1 | 62.1 | S:0, G:1, P:0, W:0 |
| data_science | 1 | 59.7 | 59.7 | 59.7 | S:0, G:0, P:1, W:0 |
| marketing_measurement | 1 | 46.7 | 46.7 | 46.7 | S:0, G:0, P:1, W:0 |
| analytics_engineering | 1 | 46.5 | 46.5 | 46.5 | S:0, G:0, P:1, W:0 |
| unknown | 1 | 21.6 | 21.6 | 21.6 | S:0, G:0, P:0, W:1 |

## Key Findings
- Most cases are concentrated in 60-80 (12/20).
- Strong Match bucket is rarely triggered in current benchmark mix.
- Average score (58.8) sits in the Partial Match range.
- Median score is 62.2.
- Potential under-scoring flags: 8.
- Potential over-scoring flags: 0.

## Flagged Cases
### potential_under_scoring
| job_id | domain_family | top_specialization | total | bucket | specialization_fit | capability_match | evidence_strength |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: |
| job-01 | marketing | product_analytics | 68.7 | Good Match | 35.6 | 21.5 | 11.6 |
| job-03 | marketing | consumer_insights | 69.8 | Good Match | 35.8 | 22 | 12 |
| job-04 | marketing | product_analytics | 68.8 | Good Match | 35.6 | 21.5 | 11.7 |
| job-06 | marketing | product_analytics | 68.8 | Good Match | 35.6 | 21.4 | 11.8 |
| job-08 | marketing | product_analytics | 68.8 | Good Match | 35.6 | 21.5 | 11.7 |
| job-11 | marketing | product_analytics | 68.5 | Good Match | 35.6 | 21.4 | 11.5 |
| job-12 | marketing | product_analytics | 69.2 | Good Match | 35.6 | 22 | 11.6 |
| job-13 | marketing | product_analytics | 67.3 | Good Match | 35.6 | 20.2 | 11.5 |

### potential_over_scoring
_none_
