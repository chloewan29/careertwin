export function Footer() {
    return (
        <footer className="border-t border-border py-8 px-4">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                        CT
                    </div>
                    <span className="font-semibold text-sm">CareerTwin</span>
                </div>
                <p className="text-sm text-muted">
                    &copy; {new Date().getFullYear()} CareerTwin. Built for job seekers, by builders.
                </p>
            </div>
        </footer>
    );
}
