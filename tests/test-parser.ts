import { parseResumeText } from './lib/career-engine/resume-parser';

const text = `
John Doe
555-0100 | john@test.com
https://linkedin.com/in/johndoe

Professional Experience
Software Engineer
Google, Sydney
Jan 2020 - Present
- Built features for the search engine platform.
- Optimized database queries for 10x performance.
- Mentored junior developers.
- Bachelor of Science, Computer Science

Education
Bachelor of Science, University of Sydney
`;

console.log(JSON.stringify(parseResumeText(text).summary, null, 2));