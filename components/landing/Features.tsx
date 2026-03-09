import { Card } from "@/components/ui/Card";

const features = [
    {
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
        ),
        title: "Upload Resume",
        description: "Drop in your PDF or DOCX resume. We extract the text instantly — no manual data entry.",
        gradient: "from-primary to-primary-light",
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
        ),
        title: "AI Parsing",
        description: "Our AI breaks down your career into structured skills, experience, and education data.",
        gradient: "from-accent to-accent-light",
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ),
        title: "Job Matching",
        description: "Paste any job description and get an instant match score showing your strengths and fit.",
        gradient: "from-primary-dark to-primary",
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
        ),
        title: "Gap Analysis",
        description: "See exactly which skills to develop and get tailored advice to land your dream role.",
        gradient: "from-accent to-primary-light",
    },
];

export function Features() {
    return (
        <section className="relative py-24 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        How It{" "}
                        <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                            Works
                        </span>
                    </h2>
                    <p className="text-muted text-lg max-w-xl mx-auto">
                        Four simple steps from resume to career roadmap.
                    </p>
                </div>

                {/* Feature cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <Card key={index} className="relative group">
                            {/* Step number */}
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-surface-light border border-border flex items-center justify-center text-xs font-bold text-muted">
                                {index + 1}
                            </div>

                            {/* Icon */}
                            <div
                                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-3 text-white mb-4 group-hover:scale-110 transition-transform duration-300`}
                            >
                                {feature.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted leading-relaxed">
                                {feature.description}
                            </p>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
