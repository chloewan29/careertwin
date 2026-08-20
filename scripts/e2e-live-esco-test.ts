import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const resumes = [
  'synthetic_commercial.docx',
  'synthetic_technical.docx',
  'synthetic_people.docx'
];

async function runTest() {
  console.log("Starting e2e live ESCO test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  for (const resume of resumes) {
    console.log(`\nTesting ${resume}...`);
    await page.goto('http://localhost:3000');
    
    // Clear storage before upload
    await page.evaluate(() => window.localStorage.clear());
    
    const input = page.locator('input[type="file"]');
    await input.waitFor({ state: 'attached' });
    
    console.log("Uploading file...");
    await input.setInputFiles(path.join(process.cwd(), resume));
    
    try {
      await Promise.race([
        page.waitForURL('**/career-map', { timeout: 60000 }),
        page.waitForSelector('#cv-upload-error', { state: 'visible', timeout: 60000 }).then(() => { throw new Error('UPLOAD_ERROR_VISIBLE'); })
      ]);
      console.log("Navigated to /career-map");
    } catch (e: any) {
      console.log("Navigation timeout or error:", e.message);
      const errorText = await page.locator('#cv-upload-error').innerText().catch(() => null);
      if (errorText) console.log("Upload Error:", errorText);
      else {
          const body = await page.innerText('body');
          console.log("Body text:", body);
      }
      continue;
    }
    
    const storageValue = await page.evaluate(() => {
      return window.localStorage.getItem('careertwin.local-career-map.v1');
    });
    
    if (!storageValue) {
      console.log("No storage value found.");
      continue;
    }
    
    const state = JSON.parse(storageValue);
    console.log(`Schema Version: ${state.schemaVersion}`);
    console.log(`Atomic Evidence Count: ${state.evidence?.length || 0}`);
    console.log(`Owned ESCO Skill Count: ${state.ownedSkills?.length || 0}`);
    
    fs.mkdirSync('artifacts', { recursive: true });
    fs.writeFileSync(`artifacts/${resume.replace('.docx', '.json')}`, JSON.stringify(state, null, 2));
  }
  
  await browser.close();
}

runTest().catch(console.error);
