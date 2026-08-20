import { buildEscoCareerMapFromServerAction } from "./esco-server-actions";
import type { EscoLocalCareerMapState } from "./local-career-map-state";

export type EscoCareerMapFileBuildFailureCode = 
  | "unsupported_file" 
  | "file_too_large" 
  | "password_protected_pdf" 
  | "scanned_or_image_only_pdf" 
  | "malformed_file" 
  | "empty_extracted_text"
  | "evidence_extraction_failed"
  | "unexpected_failure";

export type EscoCareerMapFileBuildResult = 
  | { status: "success"; state: EscoLocalCareerMapState }
  | { status: "failure"; code: EscoCareerMapFileBuildFailureCode };

export async function buildEscoCareerMapFromFile({ 
  file, 
  onStage 
}: { 
  file: Pick<File, "name" | "type" | "size" | "arrayBuffer">, 
  onStage?: (stage: "reading" | "building") => void 
}): Promise<EscoCareerMapFileBuildResult> {
  try {
    if (onStage) onStage("building");
    
    // In the browser, 'file' is already a File object.
    const browserFile = file as File;
    const formData = new FormData();
    formData.append("file", browserFile);

    const result = await buildEscoCareerMapFromServerAction(formData);
    return result;
  } catch (error) {
    console.error("Failed to build ESCO career map:", error);
    return { status: "failure", code: "unexpected_failure" };
  }
}
