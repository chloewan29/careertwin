# Domain Correction Benchmark

- Total cases: 12
- Corrections applied: 2
- Correct classifications: 12
- Incorrect classifications: 0
- Potential false positives: 0
- Missed vertical overrides: 0

| job_case | original_family | corrected_family | correction_applied | top_specialization | specialization_score | vertical_score | horizontal_score | expected_family | result_correct | result_label |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| marketing_analytics_1 | marketing | marketing | false | marketing_measurement | 8.2000 | 10.8000 | 0.0000 | marketing | true | correct |
| marketing_analytics_2 | marketing | marketing | false | campaign_analytics | 4.3000 | 6.9000 | 0.0000 | marketing | true | correct |
| product_analytics_1 | product | product | false | product_analytics | 9.5000 | 12.1000 | 0.0000 | product | true | correct |
| people_analytics_1 | hr_people | hr_people | false | people_analytics | 6.9000 | 6.9000 | 0.0000 | hr_people | true | correct |
| analytics_consulting_1 | consulting | consulting | false | analytics_consulting | 6.9000 | 6.9000 | 0.0000 | consulting | true | correct |
| fpna_1 | finance | finance | false | financial_planning_analysis | 8.0000 | 8.0000 | 0.0000 | finance | true | correct |
| commercial_finance_1 | finance | finance | false | commercial_finance | 5.6000 | 9.5000 | 0.0000 | finance | true | correct |
| bi_reporting_1 | data | data | false | bi_reporting | 11.0000 | 0.0000 | 13.5400 | data | true | correct |
| data_engineering_1 | data | data | false | data_engineering | 7.4600 | 0.0000 | 7.9400 | data | true | correct |
| business_operations_1 | operations | operations | false | business_operations | 9.5000 | 0.0000 | 10.8000 | operations | true | correct |
| sales_operations_1 | data | sales | true | sales_operations | 8.2000 | 0.0000 | 2.6000 | sales | true | correct |
| data_platform_1 | data | technology_platform | true | data_platform | 5.8000 | 0.0000 | 0.0000 | technology_platform | true | correct |

