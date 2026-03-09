import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/ui/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerTwin — Your AI Career Companion",
  description:
    "Upload your resume, discover your strengths, and match against any job description with AI-powered career insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
