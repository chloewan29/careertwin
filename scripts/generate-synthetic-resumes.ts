import * as fs from 'fs';
import { Document, Paragraph, TextRun, Packer } from 'docx';

async function generateDocx(filename: string, content: string) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: content.split('\n').map(line => 
          new Paragraph({
            children: [new TextRun(line)],
          })
        ),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename}`);
}

const commercialContent = `
John Doe
Sales Director
Experience
TechCorp, Sales Director | Jan 2020 - Present
- Led commercial analytics and campaign measurement, driving 20% revenue growth.
- Presented business cases to strategy and client stakeholders to win key accounts.
- Owned strategic planning and opportunity sizing for regional sales.
- Negotiated high-value enterprise contracts with C-level executives.
- Managed a team of 15 sales representatives and account managers.
`;

const technicalContent = `
Jane Smith
Senior Software Engineer
Experience
CloudNet, Senior Software Engineer | Jan 2018 - Present
- Designed and implemented scalable backend microservices using Node.js and TypeScript.
- Managed cloud infrastructure deployment using AWS, Terraform, and Kubernetes.
- Optimized database queries in PostgreSQL, reducing latency by 40%.
- Integrated CI/CD pipelines using GitHub Actions for automated testing and deployment.
- Led technical architecture reviews and mentored junior developers.
`;

const peopleContent = `
Alex Taylor
HR Business Partner
Experience
PeopleInc, HR Business Partner | Mar 2015 - Dec 2023
- Directed employee relations and resolved workplace conflicts in compliance with labor laws.
- Developed and implemented diversity, equity, and inclusion (DEI) training programs.
- Managed the end-to-end talent acquisition lifecycle, reducing time-to-hire by 15 days.
- Administered compensation and benefits frameworks for 500+ employees.
- Partnered with senior leadership to drive organizational design and change management initiatives.
`;

async function main() {
  await generateDocx('synthetic_commercial.docx', commercialContent.trim());
  await generateDocx('synthetic_technical.docx', technicalContent.trim());
  await generateDocx('synthetic_people.docx', peopleContent.trim());
}

main().catch(console.error);
