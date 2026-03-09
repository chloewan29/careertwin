import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
            {/* Background gradient orbs */}
            <div className="gradient-orb w-96 h-96 bg-primary/30 top-1/4 -left-48" />
            <div
                className="gradient-orb w-80 h-80 bg-accent/20 bottom-1/4 -right-40"
                style={{ animationDelay: "2s" }}
            />
            <div
                className="gradient-orb w-64 h-64 bg-primary-light/20 top-1/2 left-1/2"
                style={{ animationDelay: "4s" }}
            />

            <div className="relative z-10 text-center max-w-4xl mx-auto">
                {/* Badge */}
                <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-light border border-border text-sm text-muted mb-8">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    AI-Powered Career Intelligence
                </div>

                {/* Headline */}
                <h1 className="animate-fade-in-up-delay-1 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
                    Your Career,{" "}
                    <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                        Decoded
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="animate-fade-in-up-delay-2 text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
                    Upload your resume, instantly extract your career profile, and see
                    exactly how you match against any job description — with actionable
                    advice to close the gaps.
                </p>

                {/* CTAs */}
                <div className="animate-fade-in-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/upload">
                        <Button size="lg">
                            Get Started — It&apos;s Free
                            <svg
                                className="ml-2 w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                            </svg>
                        </Button>
                    </Link>
                    <Button variant="secondary" size="lg">
                        See How It Works
                    </Button>
                </div>
            </div>
        </section>
    );
}
