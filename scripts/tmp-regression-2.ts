
import fs from "fs";
import { buildPersonalGenericRoleAlignment } from "../lib/career-possibility/personal-generic-role-alignment-adapter";

const content = JSON.parse(fs.readFileSync("C:\\Users\\chloe\\Downloads\\careertwin-real-state-a1.json", "utf8"));
const alignmentResult = buildPersonalGenericRoleAlignment({
  personalState: content.personalState ?? content
});
if (alignmentResult.ok) {
  const admitted = alignmentResult.result.admittedRoles;
  for (const role of admitted) {
    console.log("Role: " + role.title);
    console.log("Matched: " + role.matchedCapabilities.map(c => c.canonicalLabel + " (" + c.section + ")").join(", "));
  }
}

