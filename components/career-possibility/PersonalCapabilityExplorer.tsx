"use client";
import type { PersonalCareerMapPresentation } from "@/lib/career-possibility/local-career-map-presentation-adapter";
import { buildPersonalCareerMapExplorerViewModel } from "@/lib/career-possibility/career-map-explorer-view-model";
import { CapabilityExplorer } from "./CapabilityExplorer";

export function PersonalCapabilityExplorer({ presentation }: { presentation: PersonalCareerMapPresentation }) {
  const result = buildPersonalCareerMapExplorerViewModel(presentation);
  return <section id="personal-explorer-heading" tabIndex={-1} className="mt-4 focus-visible:outline-none"><CapabilityExplorer result={result} /></section>;
}
