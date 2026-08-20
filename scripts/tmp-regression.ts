
import fs from "fs";
import { buildPersonalGenericRoleAlignment } from "../lib/career-possibility/personal-generic-role-alignment-adapter";
import { roleKnowledgeRegistry } from "../lib/career-possibility/role-knowledge/role-registry";

function testFile(path: string) {
  const content = JSON.parse(fs.readFileSync(path, "utf8"));
  const alignmentResult = buildPersonalGenericRoleAlignment({
    personalState: content.personalState ?? content
  });
  if (alignmentResult.ok) {
    const admitted = alignmentResult.result.admittedRoles;
    console.log(path + " admitted: " + admitted.length);
    console.log("Roles: " + admitted.map(r => r.title).join(", "));
  } else {
    console.log(path + " failed to align", alignmentResult.issues);
  }
}

testFile("C:\\Users\\chloe\\Downloads\\careertwin-sparse-profile-m1.json");
testFile("C:\\Users\\chloe\\Downloads\\careertwin-real-state-a1.json");

