import { CareerData } from "@/types";

export const mockCareerData: CareerData = {
    id: "mock-1",
    resume_id: "mock-resume-1",
    name: "Alex Chen",
    current_title: "Senior Full-Stack Developer",
    summary:
        "Results-driven software engineer with 6+ years of experience building scalable web applications. Passionate about clean architecture, developer experience, and shipping products that users love.",
    skills: [
        "TypeScript",
        "React",
        "Next.js",
        "Node.js",
        "Python",
        "PostgreSQL",
        "AWS",
        "Docker",
        "GraphQL",
        "Tailwind CSS",
        "Git",
        "CI/CD",
    ],
    industries: ["SaaS", "FinTech", "E-Commerce", "HealthTech"],
    experience: [
        {
            title: "Senior Full-Stack Developer",
            company: "TechCorp Solutions",
            start_date: "2022-03",
            end_date: null,
            description:
                "Leading development of a B2B SaaS platform serving 500+ enterprise clients. Architected microservices backend, reduced API latency by 40%, and mentored a team of 4 junior developers.",
        },
        {
            title: "Full-Stack Developer",
            company: "StartupXYZ",
            start_date: "2020-01",
            end_date: "2022-02",
            description:
                "Built and launched an e-commerce platform from scratch using Next.js and Stripe. Implemented real-time inventory system and payment processing handling $2M+ in monthly transactions.",
        },
        {
            title: "Frontend Developer",
            company: "Digital Agency Co",
            start_date: "2018-06",
            end_date: "2019-12",
            description:
                "Developed responsive web applications for Fortune 500 clients. Migrated legacy jQuery codebase to React, improving performance scores by 60%.",
        },
    ],
    education: [
        {
            degree: "B.S. Computer Science",
            institution: "University of Technology",
            year: "2018",
        },
        {
            degree: "Full-Stack Web Development Certificate",
            institution: "Code Academy Pro",
            year: "2017",
        },
    ],
    certifications: ["AWS Solutions Architect – Associate", "Google Cloud Professional Developer"],
    created_at: new Date().toISOString(),
};
