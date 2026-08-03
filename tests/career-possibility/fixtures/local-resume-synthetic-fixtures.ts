import { Document, Packer, Paragraph } from "docx";

export const SYNTHETIC_RESUME_LINES = [
  "Alex Example",
  "Analytics Lead",
  "Built a governed reporting framework",
  "Improved decision turnaround",
] as const;

function escapePdfText(value: string): string {
  return value.replace(/([\\()])/g, "\\$1");
}

export function makeSyntheticPdf(lines: readonly string[] = SYNTHETIC_RESUME_LINES): Uint8Array {
  const commands = lines.map((line, index) => `${index === 0 ? "72 720 Td" : "0 -24 Td"} (${escapePdfText(line)}) Tj`).join("\n");
  const stream = `BT\n/F1 12 Tf\n${commands}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

export async function makeSyntheticDocx(lines: readonly string[] = SYNTHETIC_RESUME_LINES): Promise<Uint8Array> {
  const document = new Document({ sections: [{ children: lines.map((line) => new Paragraph(line)) }] });
  return new Uint8Array(await Packer.toBuffer(document));
}
