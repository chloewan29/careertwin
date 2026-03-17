export type DomainFamily =
    | "marketing"
    | "product"
    | "data"
    | "engineering"
    | "consulting"
    | "operations"
    | "business"
    | "domain_specialist"
    | null;

export type InterpretationLayer =
    | "domain_defining"
    | "functional_role"
    | "work_mode"
    | "generic";

export interface DomainAnchor {
    domainFamily: DomainFamily;
    specializationHints: string[];
    dominantLayers: InterpretationLayer[];
    confidence: number;
    evidence: string[];
}

export type SpecializationConfig = {
    key: string;
    family?: Exclude<DomainFamily, null>;
    interpretationLayer: InterpretationLayer;
    strongSignals: string[];
    supportSignals?: string[];
    toolSignals?: string[];
    methodSignals?: string[];
};

export type DomainFamilyConfig = {
    family: Exclude<DomainFamily, null>;
    specializations: SpecializationConfig[];
};

export const DOMAIN_SIGNAL_WEIGHTS = {
    strong: 3.2,
    method: 2.8,
    tool: 2.4,
    support: 1.6,
    repeatBonus: 0.5,
};

export const DOMAIN_FAMILY_SCORE_THRESHOLD = 2.6;
export const SPECIALIZATION_SCORE_THRESHOLD = 1.9;

export const GENERIC_ROLE_LANGUAGE_SIGNALS = [
    "strategy",
    "strategic",
    "leadership",
    "stakeholder",
    "cross functional",
    "cross-functional",
    "advisory",
    "consulting",
];

export const INTERPRETATION_LAYER_PRIORITY: Record<InterpretationLayer, number> = {
    domain_defining: 4,
    functional_role: 3,
    work_mode: 2,
    generic: 1,
};

export const FUNCTIONAL_ROLE_SIGNALS = [
    "analytics leadership",
    "product management",
    "delivery leadership",
    "consulting advisory",
    "program management",
    "portfolio ownership",
    "executive decision support",
];

export const WORK_MODE_SIGNALS = [
    "stakeholder leadership",
    "cross functional",
    "cross-functional",
    "client facing",
    "reporting",
    "dashboard",
    "analysis",
    "communication",
];

export const GENERIC_TRANSFERABLE_SIGNALS = [
    "strategic thinking",
    "insight storytelling",
    "problem solving",
    "communication",
    "leadership",
    "collaboration",
];

export const DOMAIN_FAMILY_REGISTRY: DomainFamilyConfig[] = [
    {
        family: "marketing",
        specializations: [
            {
                key: "marketing_measurement",
                interpretationLayer: "domain_defining",
                strongSignals: ["marketing measurement", "media measurement", "attribution", "incrementality", "mmm", "marketing mix model"],
                methodSignals: ["causal inference", "uplift modeling", "incrementality testing"],
                toolSignals: ["google ads", "sa360", "dv360", "meta ads"],
                supportSignals: ["campaign performance", "roi", "media effectiveness"],
            },
            {
                key: "campaign_analytics",
                interpretationLayer: "domain_defining",
                strongSignals: ["campaign analytics", "campaign optimization", "channel performance"],
                methodSignals: ["a b testing", "ab testing"],
                toolSignals: ["google analytics", "adobe analytics", "looker"],
                supportSignals: ["funnel", "audience segmentation", "conversion"],
            },
            {
                key: "martech_stack",
                interpretationLayer: "domain_defining",
                strongSignals: ["martech", "marketing automation", "crm integration"],
                toolSignals: ["salesforce marketing cloud", "hubspot", "braze", "marketo"],
                supportSignals: ["lead scoring", "lifecycle marketing"],
            },
            {
                key: "media_effectiveness",
                interpretationLayer: "domain_defining",
                strongSignals: ["media effectiveness", "media mix", "channel attribution"],
                methodSignals: ["marketing mix model", "incrementality"],
                supportSignals: ["budget allocation", "media ROI"],
            },
        ],
    },
    {
        family: "product",
        specializations: [
            {
                key: "product_management",
                interpretationLayer: "domain_defining",
                strongSignals: ["product management", "product roadmap", "feature prioritization"],
                methodSignals: ["discovery", "user research"],
                supportSignals: ["stakeholder alignment", "product strategy"],
            },
            {
                key: "product_analytics",
                interpretationLayer: "domain_defining",
                strongSignals: ["product analytics", "user behavior", "activation", "retention"],
                methodSignals: ["cohort analysis", "funnel analysis"],
                toolSignals: ["amplitude", "mixpanel"],
                supportSignals: ["product metrics", "north star metric"],
            },
            {
                key: "experimentation",
                interpretationLayer: "domain_defining",
                strongSignals: ["experimentation", "a b testing", "ab testing", "test and learn"],
                methodSignals: ["hypothesis testing", "causal analysis"],
                supportSignals: ["experiment design", "variant analysis"],
            },
        ],
    },
    {
        family: "data",
        specializations: [
            {
                key: "bi_reporting",
                interpretationLayer: "domain_defining",
                strongSignals: ["bi", "reporting", "dashboard", "kpi reporting"],
                toolSignals: ["power bi", "tableau", "looker"],
                supportSignals: ["insight reporting", "performance reporting"],
            },
            {
                key: "data_platform",
                interpretationLayer: "domain_defining",
                strongSignals: ["data platform", "data warehouse", "data pipeline", "etl"],
                toolSignals: ["snowflake", "databricks", "bigquery", "dbt"],
                methodSignals: ["data modeling", "semantic layer"],
                supportSignals: ["platform migration", "data architecture"],
            },
            {
                key: "data_strategy",
                interpretationLayer: "domain_defining",
                strongSignals: ["data strategy", "data governance", "data quality"],
                methodSignals: ["operating model", "roadmap"],
                supportSignals: ["enterprise data", "data enablement"],
            },
            {
                key: "ai_data_transformation",
                interpretationLayer: "domain_defining",
                strongSignals: ["ai transformation", "data and ai transformation", "ai enablement"],
                methodSignals: ["mlops", "model lifecycle"],
                toolSignals: ["vertex ai", "azure ml", "sagemaker"],
                supportSignals: ["model deployment", "ai operating model"],
            },
        ],
    },
    {
        family: "engineering",
        specializations: [
            {
                key: "software_delivery",
                interpretationLayer: "domain_defining",
                strongSignals: ["software delivery", "engineering delivery", "application development"],
                methodSignals: ["agile delivery", "ci cd"],
                toolSignals: ["github actions", "jenkins"],
                supportSignals: ["release management", "quality engineering"],
            },
            {
                key: "ml_platform",
                interpretationLayer: "domain_defining",
                strongSignals: ["ml platform", "machine learning platform", "model serving"],
                methodSignals: ["mlops", "feature store"],
                toolSignals: ["kubeflow", "mlflow"],
                supportSignals: ["model monitoring", "inference pipeline"],
            },
            {
                key: "platform_engineering",
                interpretationLayer: "domain_defining",
                strongSignals: ["platform engineering", "developer platform", "infrastructure platform"],
                methodSignals: ["site reliability", "observability"],
                toolSignals: ["kubernetes", "terraform"],
                supportSignals: ["scalability", "resilience"],
            },
        ],
    },
    {
        family: "consulting",
        specializations: [
            {
                key: "transformation_advisory",
                interpretationLayer: "domain_defining",
                strongSignals: ["transformation advisory", "transformation consulting", "advisory"],
                methodSignals: ["operating model design", "change management"],
                supportSignals: ["enterprise transformation", "executive advisory"],
            },
            {
                key: "strategy_advisory",
                interpretationLayer: "domain_defining",
                strongSignals: ["strategy advisory", "strategic advisory", "board advisory"],
                methodSignals: ["strategic planning", "scenario planning"],
                supportSignals: ["business case", "portfolio strategy"],
            },
            {
                key: "client_delivery",
                interpretationLayer: "domain_defining",
                strongSignals: ["client delivery", "engagement delivery", "consulting engagement"],
                methodSignals: ["workshop facilitation", "stakeholder alignment"],
                supportSignals: ["client stakeholders", "delivery quality"],
            },
        ],
    },
    {
        family: "operations",
        specializations: [
            {
                key: "program_delivery",
                interpretationLayer: "domain_defining",
                strongSignals: ["program delivery", "portfolio delivery", "delivery governance"],
                methodSignals: ["program governance", "dependency management"],
                supportSignals: ["multi team delivery", "delivery assurance"],
            },
            {
                key: "service_operations",
                interpretationLayer: "domain_defining",
                strongSignals: ["service operations", "service delivery", "operational service"],
                methodSignals: ["service management", "incident management"],
                supportSignals: ["sla", "operational support"],
            },
            {
                key: "process_optimization",
                interpretationLayer: "domain_defining",
                strongSignals: ["process optimization", "operational efficiency", "continuous improvement"],
                methodSignals: ["lean", "six sigma"],
                supportSignals: ["workflow redesign", "cost optimization"],
            },
        ],
    },
    {
        family: "business",
        specializations: [
            {
                key: "commercial_strategy",
                interpretationLayer: "domain_defining",
                strongSignals: ["commercial strategy", "revenue strategy", "growth strategy"],
                methodSignals: ["pricing strategy", "go to market strategy"],
                supportSignals: ["commercial performance", "profitability"],
            },
            {
                key: "business_planning",
                interpretationLayer: "domain_defining",
                strongSignals: ["business planning", "strategic planning", "annual planning"],
                methodSignals: ["planning cadence", "portfolio planning"],
                supportSignals: ["business priorities", "planning process"],
            },
            {
                key: "financial_analysis",
                interpretationLayer: "domain_defining",
                strongSignals: ["financial analysis", "fp&a", "forecasting", "budgeting"],
                methodSignals: ["scenario modeling", "variance analysis"],
                supportSignals: ["p&l", "financial performance"],
            },
        ],
    },
    {
        family: "domain_specialist",
        specializations: [
            {
                key: "legal",
                interpretationLayer: "domain_defining",
                strongSignals: ["legal", "law firm", "legal workflows", "legal operations"],
                methodSignals: ["contract review", "compliance review"],
                supportSignals: ["regulatory", "policy"],
            },
            {
                key: "healthcare",
                interpretationLayer: "domain_defining",
                strongSignals: ["healthcare", "clinical", "patient", "medical"],
                methodSignals: ["clinical workflow", "care pathway"],
                supportSignals: ["health system", "clinical operations"],
            },
            {
                key: "finance",
                interpretationLayer: "domain_defining",
                strongSignals: ["financial services", "banking", "capital markets", "insurance"],
                methodSignals: ["risk controls", "regulatory reporting"],
                supportSignals: ["compliance", "financial products"],
            },
            {
                key: "supply_chain",
                interpretationLayer: "domain_defining",
                strongSignals: ["supply chain", "procurement", "logistics", "inventory"],
                methodSignals: ["demand planning", "network optimization"],
                supportSignals: ["operations planning", "fulfillment"],
            },
        ],
    },
];


