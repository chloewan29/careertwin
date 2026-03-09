import Link from "next/link";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/upload", label: "Upload" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/match", label: "Job Match" },
    { href: "/match-history", label: "History" },
];

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
                        CT
                    </div>
                    <span className="font-semibold text-sm hidden sm:block">CareerTwin</span>
                </Link>

                {/* Links */}
                <div className="flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="px-3 py-2 text-sm text-muted hover:text-foreground rounded-lg hover:bg-surface-light transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}
