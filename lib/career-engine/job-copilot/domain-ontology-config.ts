export type DomainType = "vertical" | "horizontal";

export type DomainFamily =
  | "marketing"
  | "product"
  | "data"
  | "finance"
  | "consulting"
  | "sales"
  | "operations"
  | "supply_chain"
  | "customer_success"
  | "hr_people"
  | "legal"
  | "healthcare"
  | "retail_commerce"
  | "media_content"
  | "energy_industrial"
  | "technology_platform";

export type DomainSpecialization =
  | "marketing_measurement"
  | "campaign_analytics"
  | "performance_marketing"
  | "growth_marketing"
  | "crm_lifecycle_marketing"
  | "brand_marketing"
  | "consumer_insights"
  | "marketing_strategy"
  | "product_management"
  | "product_analytics"
  | "growth_product"
  | "platform_product"
  | "technical_product_management"
  | "product_strategy"
  | "product_operations"
  | "bi_reporting"
  | "data_analytics"
  | "analytics_engineering"
  | "data_science"
  | "data_engineering"
  | "decision_support_analytics"
  | "insights_reporting"
  | "financial_planning_analysis"
  | "commercial_finance"
  | "investment_analysis"
  | "risk_finance"
  | "pricing_profitability"
  | "revenue_operations_finance"
  | "treasury_finance"
  | "management_consulting"
  | "strategy_consulting"
  | "transformation_consulting"
  | "analytics_consulting"
  | "implementation_consulting"
  | "client_advisory"
  | "sales_strategy"
  | "sales_operations"
  | "business_development"
  | "account_management"
  | "partnerships"
  | "revenue_growth"
  | "business_operations"
  | "program_operations"
  | "service_operations"
  | "process_improvement"
  | "operational_excellence"
  | "workforce_operations"
  | "delivery_operations"
  | "demand_planning"
  | "inventory_optimization"
  | "logistics_operations"
  | "procurement_sourcing"
  | "supply_chain_analytics"
  | "network_planning"
  | "fulfillment_operations"
  | "customer_success_management"
  | "customer_operations"
  | "customer_lifecycle"
  | "retention_expansion"
  | "implementation_onboarding"
  | "support_strategy"
  | "people_analytics"
  | "talent_acquisition"
  | "learning_development"
  | "employee_experience"
  | "compensation_benefits"
  | "hr_operations"
  | "workforce_planning"
  | "legal_operations"
  | "compliance_regulatory"
  | "contract_management"
  | "privacy_governance"
  | "corporate_legal_support"
  | "clinical_operations"
  | "healthcare_analytics"
  | "population_health"
  | "healthcare_strategy"
  | "care_delivery_improvement"
  | "healthcare_compliance"
  | "merchandising_analytics"
  | "ecommerce_analytics"
  | "trade_promotion"
  | "category_management"
  | "retail_operations"
  | "pricing_promotion_analytics"
  | "audience_analytics"
  | "content_strategy"
  | "media_planning"
  | "media_sales_strategy"
  | "subscriber_growth"
  | "content_performance"
  | "energy_analytics"
  | "asset_operations"
  | "industrial_strategy"
  | "field_operations_support"
  | "utilities_planning"
  | "capital_project_analytics"
  | "ai_ml"
  | "cybersecurity"
  | "data_platform"
  | "platform_operations"
  | "cloud_infrastructure"
  | "developer_platform"
  | "technical_solution_architecture";

export type DomainOntologyEntry = {
  type: DomainType;
  specializations: readonly DomainSpecialization[];
};

export type SpecializationSignalConfig = {
  family: DomainFamily;
  canonical_signals: string[];
  anti_signals: string[];
  common_tools: string[];
};

// Ontology backbone for job interpretation; config-only, no scoring logic.
export const DOMAIN_ONTOLOGY_SKELETON = {
  marketing: {
    type: "vertical",
    specializations: [
      "marketing_measurement",
      "campaign_analytics",
      "performance_marketing",
      "growth_marketing",
      "crm_lifecycle_marketing",
      "brand_marketing",
      "consumer_insights",
      "marketing_strategy",
    ],
  },
  product: {
    type: "vertical",
    specializations: [
      "product_management",
      "product_analytics",
      "growth_product",
      "platform_product",
      "technical_product_management",
      "product_strategy",
      "product_operations",
    ],
  },
  data: {
    type: "horizontal",
    specializations: [
      "bi_reporting",
      "data_analytics",
      "analytics_engineering",
      "data_science",
      "data_engineering",
      "decision_support_analytics",
      "insights_reporting",
    ],
  },
  finance: {
    type: "vertical",
    specializations: [
      "financial_planning_analysis",
      "commercial_finance",
      "investment_analysis",
      "risk_finance",
      "pricing_profitability",
      "revenue_operations_finance",
      "treasury_finance",
    ],
  },
  consulting: {
    type: "vertical",
    specializations: [
      "management_consulting",
      "strategy_consulting",
      "transformation_consulting",
      "analytics_consulting",
      "implementation_consulting",
      "client_advisory",
    ],
  },
  sales: {
    type: "horizontal",
    specializations: [
      "sales_strategy",
      "sales_operations",
      "business_development",
      "account_management",
      "partnerships",
      "revenue_growth",
    ],
  },
  operations: {
    type: "horizontal",
    specializations: [
      "business_operations",
      "program_operations",
      "service_operations",
      "process_improvement",
      "operational_excellence",
      "workforce_operations",
      "delivery_operations",
    ],
  },
  supply_chain: {
    type: "vertical",
    specializations: [
      "demand_planning",
      "inventory_optimization",
      "logistics_operations",
      "procurement_sourcing",
      "supply_chain_analytics",
      "network_planning",
      "fulfillment_operations",
    ],
  },
  customer_success: {
    type: "horizontal",
    specializations: [
      "customer_success_management",
      "customer_operations",
      "customer_lifecycle",
      "retention_expansion",
      "implementation_onboarding",
      "support_strategy",
    ],
  },
  hr_people: {
    type: "vertical",
    specializations: [
      "people_analytics",
      "talent_acquisition",
      "learning_development",
      "employee_experience",
      "compensation_benefits",
      "hr_operations",
      "workforce_planning",
    ],
  },
  legal: {
    type: "vertical",
    specializations: [
      "legal_operations",
      "compliance_regulatory",
      "contract_management",
      "privacy_governance",
      "corporate_legal_support",
    ],
  },
  healthcare: {
    type: "vertical",
    specializations: [
      "clinical_operations",
      "healthcare_analytics",
      "population_health",
      "healthcare_strategy",
      "care_delivery_improvement",
      "healthcare_compliance",
    ],
  },
  retail_commerce: {
    type: "vertical",
    specializations: [
      "merchandising_analytics",
      "ecommerce_analytics",
      "trade_promotion",
      "category_management",
      "retail_operations",
      "pricing_promotion_analytics",
    ],
  },
  media_content: {
    type: "vertical",
    specializations: [
      "audience_analytics",
      "content_strategy",
      "media_planning",
      "media_sales_strategy",
      "subscriber_growth",
      "content_performance",
    ],
  },
  energy_industrial: {
    type: "vertical",
    specializations: [
      "energy_analytics",
      "asset_operations",
      "industrial_strategy",
      "field_operations_support",
      "utilities_planning",
      "capital_project_analytics",
    ],
  },
  technology_platform: {
    type: "horizontal",
    specializations: [
      "ai_ml",
      "cybersecurity",
      "data_platform",
      "platform_operations",
      "cloud_infrastructure",
      "developer_platform",
      "technical_solution_architecture",
    ],
  },
} as const satisfies Record<DomainFamily, DomainOntologyEntry>;

export const FIRST_PASS_SPECIALIZATION_SIGNAL_KEYS = [
  "marketing_measurement",
  "campaign_analytics",
  "performance_marketing",
  "growth_marketing",
  "crm_lifecycle_marketing",
  "consumer_insights",
  "product_management",
  "product_analytics",
  "growth_product",
  "platform_product",
  "technical_product_management",
  "bi_reporting",
  "data_analytics",
  "analytics_engineering",
  "data_science",
  "data_engineering",
  "financial_planning_analysis",
  "commercial_finance",
  "pricing_profitability",
  "management_consulting",
  "strategy_consulting",
  "analytics_consulting",
  "sales_operations",
  "business_development",
  "business_operations",
  "program_operations",
  "people_analytics",
  "ecommerce_analytics",
  "audience_analytics",
  "data_platform",
] as const satisfies readonly DomainSpecialization[];

export type FirstPassDomainSpecialization =
  typeof FIRST_PASS_SPECIALIZATION_SIGNAL_KEYS[number];

// First specialization signal scaffold for deterministic, inspectable detection.
export const SPECIALIZATION_SIGNAL_MAP: Record<
  FirstPassDomainSpecialization,
  SpecializationSignalConfig
> = {
  marketing_measurement: {
    family: "marketing",
    canonical_signals: [
      "marketing measurement",
      "media measurement",
      "incrementality",
      "incrementality testing",
      "attribution",
      "marketing attribution",
      "media mix modeling",
      "mmm",
      "causal lift",
      "campaign effectiveness",
      "measurement framework",
    ],
    anti_signals: [
      "product roadmap",
      "financial planning",
      "hr operations",
      "data pipeline",
      "cybersecurity",
    ],
    common_tools: ["sql", "python", "tableau", "power bi", "excel", "looker"],
  },
  campaign_analytics: {
    family: "marketing",
    canonical_signals: [
      "campaign analytics",
      "campaign performance",
      "ad performance",
      "media performance",
      "channel performance",
      "campaign reporting",
      "marketing dashboard",
      "campaign insights",
      "paid media analysis",
      "cross channel analysis",
    ],
    anti_signals: ["product strategy", "fp&a", "supply planning", "legal operations"],
    common_tools: [
      "sql",
      "tableau",
      "power bi",
      "excel",
      "google analytics",
      "adobe analytics",
    ],
  },
  performance_marketing: {
    family: "marketing",
    canonical_signals: [
      "performance marketing",
      "paid search",
      "paid social",
      "customer acquisition",
      "roas",
      "cac",
      "conversion optimization",
      "media buying",
      "digital acquisition",
      "campaign optimization",
    ],
    anti_signals: ["brand tracking", "clinical operations", "contract management", "data warehousing"],
    common_tools: [
      "google ads",
      "meta ads manager",
      "sql",
      "excel",
      "tableau",
      "google analytics",
    ],
  },
  growth_marketing: {
    family: "marketing",
    canonical_signals: [
      "growth marketing",
      "growth strategy",
      "user acquisition",
      "activation",
      "retention marketing",
      "lifecycle growth",
      "growth funnel",
      "conversion funnel",
      "experimentation",
      "growth initiatives",
    ],
    anti_signals: ["enterprise architecture", "treasury", "logistics operations", "privacy compliance"],
    common_tools: ["sql", "excel", "google analytics", "mixpanel", "amplitude", "tableau"],
  },
  crm_lifecycle_marketing: {
    family: "marketing",
    canonical_signals: [
      "crm",
      "lifecycle marketing",
      "customer lifecycle",
      "email marketing",
      "retention campaigns",
      "customer segmentation",
      "personalization",
      "journey orchestration",
      "loyalty marketing",
      "engagement campaigns",
    ],
    anti_signals: ["field operations", "financial modeling", "developer platform", "contract review"],
    common_tools: ["salesforce", "braze", "hubspot", "marketo", "excel", "sql"],
  },
  consumer_insights: {
    family: "marketing",
    canonical_signals: [
      "consumer insights",
      "customer insights",
      "market research",
      "brand tracking",
      "audience research",
      "survey analysis",
      "consumer behavior",
      "segmentation research",
      "insight generation",
      "qualitative research",
    ],
    anti_signals: ["data engineering", "product delivery", "pricing operations", "clinical compliance"],
    common_tools: ["excel", "qualtrics", "power bi", "tableau", "sql"],
  },
  product_management: {
    family: "product",
    canonical_signals: [
      "product management",
      "product roadmap",
      "product requirements",
      "feature prioritization",
      "stakeholder alignment",
      "customer needs",
      "product delivery",
      "go to market",
      "product vision",
      "requirements definition",
    ],
    anti_signals: ["campaign performance", "fp&a", "procurement sourcing", "employee relations"],
    common_tools: ["jira", "confluence", "figma", "sql", "amplitude", "mixpanel"],
  },
  product_analytics: {
    family: "product",
    canonical_signals: [
      "product analytics",
      "user behavior",
      "feature performance",
      "funnel analysis",
      "product metrics",
      "product insights",
      "feature adoption",
      "retention analysis",
      "ab testing",
      "experimentation",
    ],
    anti_signals: ["media mix modeling", "commercial finance", "legal compliance", "inventory optimization"],
    common_tools: ["sql", "python", "amplitude", "mixpanel", "tableau", "power bi"],
  },
  growth_product: {
    family: "product",
    canonical_signals: [
      "growth product",
      "activation",
      "retention",
      "product led growth",
      "conversion funnel",
      "user journey",
      "experimentation roadmap",
      "growth experiments",
      "north star metric",
      "engagement optimization",
    ],
    anti_signals: ["financial close", "contract lifecycle", "clinical workflow", "supply network"],
    common_tools: ["amplitude", "mixpanel", "sql", "jira", "figma"],
  },
  platform_product: {
    family: "product",
    canonical_signals: [
      "platform product",
      "platform capabilities",
      "internal platform",
      "api platform",
      "platform roadmap",
      "shared services platform",
      "developer experience",
      "scalability",
      "platform adoption",
      "technical platform strategy",
    ],
    anti_signals: ["paid social", "merchandising", "talent acquisition", "clinical operations"],
    common_tools: ["jira", "confluence", "sql", "postman", "cloud platforms"],
  },
  technical_product_management: {
    family: "product",
    canonical_signals: [
      "technical product management",
      "technical requirements",
      "api product",
      "platform architecture",
      "engineering partnership",
      "system integration",
      "technical roadmap",
      "developer platform",
      "platform dependencies",
      "solution design",
    ],
    anti_signals: ["brand strategy", "trade promotion", "workforce planning", "revenue accounting"],
    common_tools: ["jira", "confluence", "postman", "sql", "cloud platforms"],
  },
  bi_reporting: {
    family: "data",
    canonical_signals: [
      "bi reporting",
      "dashboard development",
      "reporting",
      "kpi reporting",
      "stakeholder reporting",
      "management reporting",
      "dashboard delivery",
      "business intelligence",
      "data visualization",
      "report automation",
    ],
    anti_signals: ["incrementality", "product roadmap", "pricing strategy", "people analytics"],
    common_tools: ["power bi", "tableau", "sql", "excel", "looker"],
  },
  data_analytics: {
    family: "data",
    canonical_signals: [
      "data analysis",
      "data analytics",
      "insight generation",
      "trend analysis",
      "root cause analysis",
      "business insights",
      "analytical problem solving",
      "decision support",
      "ad hoc analysis",
      "data driven insights",
    ],
    anti_signals: ["media mix modeling", "product roadmap", "contract negotiations", "clinical care delivery"],
    common_tools: ["sql", "python", "excel", "tableau", "power bi"],
  },
  analytics_engineering: {
    family: "data",
    canonical_signals: [
      "analytics engineering",
      "semantic layer",
      "metrics layer",
      "data modeling",
      "transformation pipelines",
      "dbt",
      "trusted datasets",
      "analytics enablement",
      "data quality",
      "reporting layer",
    ],
    anti_signals: ["consumer research", "account growth", "employee engagement", "legal review"],
    common_tools: ["dbt", "sql", "snowflake", "bigquery", "looker", "python"],
  },
  data_science: {
    family: "data",
    canonical_signals: [
      "data science",
      "predictive modeling",
      "statistical modeling",
      "machine learning",
      "forecasting",
      "model development",
      "feature engineering",
      "experimentation analysis",
      "causal inference",
      "advanced analytics",
    ],
    anti_signals: ["brand marketing", "contract operations", "field services", "talent operations"],
    common_tools: ["python", "r", "sql", "spark", "notebooks"],
  },
  data_engineering: {
    family: "data",
    canonical_signals: [
      "data engineering",
      "etl",
      "elt",
      "data pipelines",
      "data ingestion",
      "orchestration",
      "data infrastructure",
      "batch processing",
      "streaming data",
      "pipeline reliability",
    ],
    anti_signals: ["campaign analytics", "pricing strategy", "customer lifecycle", "clinical improvement"],
    common_tools: ["sql", "python", "airflow", "spark", "snowflake", "databricks"],
  },
  financial_planning_analysis: {
    family: "finance",
    canonical_signals: [
      "fp&a",
      "financial planning",
      "budgeting",
      "forecasting",
      "variance analysis",
      "management finance",
      "financial performance",
      "planning cycle",
      "monthly forecast",
      "financial insights",
    ],
    anti_signals: ["campaign attribution", "product discovery", "people engagement", "developer platform"],
    common_tools: ["excel", "power bi", "sql", "erp", "planning tools"],
  },
  commercial_finance: {
    family: "finance",
    canonical_signals: [
      "commercial finance",
      "business partnering",
      "commercial insights",
      "revenue analysis",
      "profitability analysis",
      "pricing support",
      "investment cases",
      "commercial decision support",
      "financial business partner",
      "margin analysis",
    ],
    anti_signals: ["media planning", "product backlog", "workforce operations", "contract administration"],
    common_tools: ["excel", "sql", "power bi", "sap"],
  },
  pricing_profitability: {
    family: "finance",
    canonical_signals: [
      "pricing",
      "pricing strategy",
      "profitability",
      "margin optimization",
      "price sensitivity",
      "commercial pricing",
      "price modeling",
      "revenue optimization",
      "discount strategy",
      "pricing analytics",
    ],
    anti_signals: ["brand research", "platform architecture", "employee experience", "clinical governance"],
    common_tools: ["excel", "sql", "python", "power bi"],
  },
  management_consulting: {
    family: "consulting",
    canonical_signals: [
      "management consulting",
      "client engagement",
      "problem solving",
      "executive presentation",
      "business case",
      "workstream leadership",
      "stakeholder interviews",
      "recommendations development",
      "transformation program",
      "advisory services",
    ],
    anti_signals: ["campaign optimization", "etl pipelines", "clinical coding", "email lifecycle"],
    common_tools: ["powerpoint", "excel", "sql"],
  },
  strategy_consulting: {
    family: "consulting",
    canonical_signals: [
      "strategy consulting",
      "growth strategy",
      "market entry",
      "corporate strategy",
      "strategic initiatives",
      "portfolio strategy",
      "strategic analysis",
      "board level recommendations",
      "long range planning",
      "strategic options",
    ],
    anti_signals: ["dashboard delivery", "talent operations", "procurement execution", "field maintenance"],
    common_tools: ["powerpoint", "excel", "market research tools"],
  },
  analytics_consulting: {
    family: "consulting",
    canonical_signals: [
      "analytics consulting",
      "client analytics",
      "analytical advisory",
      "insight led recommendations",
      "analytics transformation",
      "measurement consulting",
      "decision support consulting",
      "stakeholder storytelling",
      "business analytics advisory",
      "consulting delivery",
    ],
    anti_signals: ["software engineering", "contract review", "clinical care", "warehouse operations"],
    common_tools: ["sql", "excel", "tableau", "power bi", "powerpoint"],
  },
  sales_operations: {
    family: "sales",
    canonical_signals: [
      "sales operations",
      "sales planning",
      "territory planning",
      "pipeline management",
      "sales process",
      "crm governance",
      "quota support",
      "forecast support",
      "sales reporting",
      "go to market operations",
    ],
    anti_signals: ["marketing attribution", "product discovery", "care delivery", "privacy operations"],
    common_tools: ["salesforce", "excel", "power bi", "sql"],
  },
  business_development: {
    family: "sales",
    canonical_signals: [
      "business development",
      "partnership development",
      "new business",
      "client acquisition",
      "deal pipeline",
      "market expansion",
      "partner negotiations",
      "commercial relationships",
      "opportunity development",
      "revenue growth",
    ],
    anti_signals: ["etl development", "employee analytics", "inventory planning", "legal compliance"],
    common_tools: ["salesforce", "excel", "crm tools"],
  },
  business_operations: {
    family: "operations",
    canonical_signals: [
      "business operations",
      "operating rhythm",
      "cross functional coordination",
      "operational planning",
      "business process",
      "execution support",
      "operating model",
      "performance tracking",
      "governance cadence",
      "run the business",
    ],
    anti_signals: ["attribution modeling", "clinical analytics", "developer tooling", "compensation design"],
    common_tools: ["excel", "power bi", "sql", "jira"],
  },
  program_operations: {
    family: "operations",
    canonical_signals: [
      "program operations",
      "program delivery",
      "program governance",
      "milestone tracking",
      "cross functional delivery",
      "operational readiness",
      "execution management",
      "rollout coordination",
      "implementation support",
      "program reporting",
    ],
    anti_signals: ["consumer segmentation", "pricing optimization", "contract drafting", "machine learning research"],
    common_tools: ["jira", "excel", "smartsheet", "power bi"],
  },
  people_analytics: {
    family: "hr_people",
    canonical_signals: [
      "people analytics",
      "workforce analytics",
      "employee data",
      "talent analytics",
      "attrition analysis",
      "engagement analysis",
      "headcount planning",
      "organizational insights",
      "people metrics",
      "hr analytics",
    ],
    anti_signals: ["campaign measurement", "product funnel", "supply chain network", "security operations"],
    common_tools: ["excel", "power bi", "tableau", "sql", "workday"],
  },
  ecommerce_analytics: {
    family: "retail_commerce",
    canonical_signals: [
      "ecommerce analytics",
      "online sales",
      "digital commerce",
      "basket analysis",
      "conversion rate",
      "onsite funnel",
      "merchandising performance",
      "trading performance",
      "customer purchase behavior",
      "commerce insights",
    ],
    anti_signals: ["api architecture", "legal support", "clinical workflow", "employee relations"],
    common_tools: ["google analytics", "adobe analytics", "sql", "power bi", "tableau"],
  },
  audience_analytics: {
    family: "media_content",
    canonical_signals: [
      "audience analytics",
      "audience measurement",
      "viewership analysis",
      "subscriber analytics",
      "content consumption",
      "audience behavior",
      "engagement metrics",
      "media insights",
      "reach and frequency",
      "audience segmentation",
    ],
    anti_signals: ["product architecture", "financial close", "sourcing strategy", "employee operations"],
    common_tools: ["sql", "tableau", "power bi", "adobe analytics", "google analytics"],
  },
  data_platform: {
    family: "technology_platform",
    canonical_signals: [
      "data platform",
      "data enablement",
      "platform architecture",
      "shared data services",
      "data infrastructure strategy",
      "platform reliability",
      "data governance platform",
      "platform capabilities",
      "self service data",
      "data foundations",
    ],
    anti_signals: ["campaign optimization", "consumer insights", "quota planning", "employee experience"],
    common_tools: ["snowflake", "databricks", "bigquery", "airflow", "dbt", "cloud platforms"],
  },
} as const;

export type DomainSpecializationSignalConfig = SpecializationSignalConfig;
export const FIRST_PASS_SPECIALIZATION_SIGNAL_KEYS_V1 = FIRST_PASS_SPECIALIZATION_SIGNAL_KEYS;
export type FirstPassDomainSpecializationV1 = FirstPassDomainSpecialization;
export const DOMAIN_SPECIALIZATION_SIGNAL_MAP_V1 = SPECIALIZATION_SIGNAL_MAP;

export function getDomainSpecializations(
  family: DomainFamily,
): readonly DomainSpecialization[] {
  return DOMAIN_ONTOLOGY_SKELETON[family].specializations;
}

export function getDomainType(family: DomainFamily): DomainType {
  return DOMAIN_ONTOLOGY_SKELETON[family].type;
}

export function getSpecializationSignalConfig(
  specialization: FirstPassDomainSpecialization,
): SpecializationSignalConfig {
  return SPECIALIZATION_SIGNAL_MAP[specialization];
}
