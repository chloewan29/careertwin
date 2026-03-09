import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}

export function Button({
    variant = "primary",
    size = "md",
    className = "",
    children,
    ...props
}: ButtonProps) {
    const base =
        "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 cursor-pointer";

    const variants = {
        primary:
            "bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]",
        secondary:
            "bg-surface-light text-foreground border border-border hover:border-primary/50 hover:bg-surface active:scale-[0.98]",
        ghost:
            "text-muted hover:text-foreground hover:bg-surface-light",
    };

    const sizes = {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
    };

    return (
        <button
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
