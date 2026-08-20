# Domain Failure Triage

Cases analyzed: 3

## CASE: people_analytics_1

- expected_family: hr_people
- original_family: hr_people
- corrected_family: hr_people
- correction_applied: false
- correction_reason: original_winner_not_horizontal

Top Specializations
1. people_analytics (hr_people) score=6.9
canonical_hits=5, anti_hits=0, tool_hits=0
2. analytics_engineering (data) score=1.3
canonical_hits=1, anti_hits=0, tool_hits=0
3. technical_product_management (product) score=-0.45
canonical_hits=0, anti_hits=1, tool_hits=0
4. bi_reporting (data) score=-0.45
canonical_hits=1, anti_hits=3, tool_hits=0

Family Aggregation
- hr_people: 6.9
- data: 0.85
- marketing: 0
- finance: 0
- consulting: 0
- sales: 0
- operations: 0
- supply_chain: 0
- customer_success: 0
- legal: 0
- healthcare: 0
- retail_commerce: 0
- media_content: 0
- energy_industrial: 0
- technology_platform: 0
- product: -0.45

Correction Conditions
- original_horizontal: false
- top_specialization_vertical: true
- specialization_score_threshold: true
- vertical_vs_horizontal_score_ratio: true
- min_canonical_signals: true

Root Cause
- legacy_family_mapping_gap
- Explanation: Correction gates were mostly satisfied but final family mapping did not land on expected ontology family.
- Recommended fix category: adjust ontology family mapping

## CASE: sales_operations_1

- expected_family: sales
- original_family: data
- corrected_family: operations
- correction_applied: false
- correction_reason: no_vertical_top_specialization

Top Specializations
1. sales_operations (sales) score=8.2
canonical_hits=6, anti_hits=0, tool_hits=0
2. crm_lifecycle_marketing (marketing) score=1.3
canonical_hits=1, anti_hits=0, tool_hits=0
3. bi_reporting (data) score=1.3
canonical_hits=1, anti_hits=0, tool_hits=0
4. data_science (data) score=1.3
canonical_hits=1, anti_hits=0, tool_hits=0
5. financial_planning_analysis (finance) score=1.3
canonical_hits=1, anti_hits=0, tool_hits=0

Family Aggregation
- sales: 8.2
- data: 2.6
- marketing: 1.3
- finance: 1.3
- operations: 1.3
- technology_platform: 1.3
- product: 0
- consulting: 0
- supply_chain: 0
- customer_success: 0
- hr_people: 0
- legal: 0
- healthcare: 0
- retail_commerce: 0
- media_content: 0
- energy_industrial: 0

Correction Conditions
- original_horizontal: true
- top_specialization_vertical: false
- specialization_score_threshold: true
- vertical_vs_horizontal_score_ratio: false
- min_canonical_signals: true

Root Cause
- horizontal_family_score_domination
- Explanation: Top specialization stayed in a horizontal family, so no vertical override candidate was available.
- Recommended fix category: adjust family aggregation logic

## CASE: data_platform_1

- expected_family: technology_platform
- original_family: data
- corrected_family: data
- correction_applied: false
- correction_reason: no_vertical_top_specialization

Top Specializations
1. data_platform (technology_platform) score=5.8
canonical_hits=4, anti_hits=0, tool_hits=0

Family Aggregation
- technology_platform: 5.8
- marketing: 0
- product: 0
- data: 0
- finance: 0
- consulting: 0
- sales: 0
- operations: 0
- supply_chain: 0
- customer_success: 0
- hr_people: 0
- legal: 0
- healthcare: 0
- retail_commerce: 0
- media_content: 0
- energy_industrial: 0

Correction Conditions
- original_horizontal: true
- top_specialization_vertical: false
- specialization_score_threshold: true
- vertical_vs_horizontal_score_ratio: false
- min_canonical_signals: false

Root Cause
- horizontal_family_score_domination
- Explanation: Top specialization stayed in a horizontal family, so no vertical override candidate was available.
- Recommended fix category: adjust family aggregation logic

