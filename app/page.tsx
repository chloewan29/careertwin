"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [hasResumeText, setHasResumeText] = useState(false);

  return (
    <main className="min-h-screen bg-[#050912] px-5 pb-6 pt-24 text-[#e8f4f6] sm:px-8 sm:pb-8 sm:pt-28">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col">
        <div className="flex items-center justify-between border-b border-cyan-100/10 pb-5 text-sm">
          <span className="font-medium text-cyan-200">Career possibility explorer</span>
          <span className="hidden text-slate-500 sm:block">Frontend prototype</span>
        </div>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1fr_0.92fr] lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Your experience is bigger than your job title</p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              “I know what I have done, but I don’t know what else I can do.”
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
              Turn your resume into a map of transferable capabilities, credible role directions, and the evidence behind them.
            </p>
          </div>

          <div className="rounded-[2rem] border border-cyan-100/10 bg-[#0b1321]/90 p-6 shadow-[0_24px_90px_rgba(6,182,212,0.09)] backdrop-blur sm:p-8">
            <h2 className="text-xl font-semibold">Start with your resume</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Upload a CV or paste the text below. No backend connection yet.</p>

            <label className={`mt-6 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 text-center transition ${fileName ? "border-cyan-300/60 bg-cyan-300/10" : "border-slate-600 bg-white/[0.025] hover:border-cyan-300/60 hover:bg-cyan-300/5"}`}>
              <input
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
              />
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${fileName ? "bg-cyan-300 text-[#061018]" : "bg-cyan-300/10 text-cyan-300"}`} aria-hidden="true">{fileName ? "✓" : "↑"}</span>
              <span className="mt-3 text-sm font-semibold">{fileName ? "CV selected ✓" : "Choose your CV"}</span>
              <span className="mt-1 max-w-full truncate text-xs text-slate-400">{fileName || "PDF or DOCX · mock only"}</span>
              {fileName && <span className="mt-2 text-xs text-cyan-200">Ready to explore your capability map</span>}
              {fileName && <span className="mt-1 text-[11px] text-slate-500">Mock preview only — not saved yet</span>}
            </label>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-600"><span className="h-px flex-1 bg-white/10" /> or paste <span className="h-px flex-1 bg-white/10" /></div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="resume-text" className="text-sm font-medium">Resume text</label>
              {hasResumeText && <span className="text-xs font-medium text-cyan-300">Resume text added ✓</span>}
            </div>
            <textarea
              id="resume-text"
              rows={7}
              onChange={(event) => setHasResumeText(event.target.value.trim().length > 0)}
              placeholder="Paste your experience, achievements, and skills here…"
              className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#07101c] px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
            />
            {hasResumeText && <p className="mt-2 text-xs text-slate-500">Mock preview only — your resume text is not saved yet.</p>}

            <Link href="/career-map" className="mt-5 flex w-full items-center justify-center rounded-full bg-cyan-300 px-5 py-3.5 text-sm font-semibold text-[#061018] transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#0b1321]">
              Show me what else I could do <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">We show the evidence behind every suggestion — and the gaps where proof is missing.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
