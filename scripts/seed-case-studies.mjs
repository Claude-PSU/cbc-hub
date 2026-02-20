/**
 * seed-case-studies.mjs  —  Firebase Admin SDK seeder
 * ─────────────────────────────────────────────────
 * Run from /web:
 *   node scripts/seed-case-studies.mjs
 *
 * Requires a service account key to bypass Firestore security rules.
 * Set one of:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json   (env var)
 *   OR place the JSON file at:  web/scripts/serviceAccountKey.json
 *
 * How to get a service account key:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *
 * Flags:
 *   --force   overwrite documents that already exist
 */

import { createRequire } from "module";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load firebase-admin ────────────────────────────────────────────────────────
const admin = require("firebase-admin");

// ── Resolve service account credentials ───────────────────────────────────────
const localKeyPath = resolve(__dirname, "serviceAccountKey.json");
let credential;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  credential = admin.credential.applicationDefault();
  console.log("🔑  Using GOOGLE_APPLICATION_CREDENTIALS env var");
} else if (existsSync(localKeyPath)) {
  const serviceAccount = require(localKeyPath);
  credential = admin.credential.cert(serviceAccount);
  console.log("🔑  Using scripts/serviceAccountKey.json");
} else {
  console.error(`
❌  No credentials found.

To seed Firestore you need a Firebase Admin service account key.

Steps:
  1. Go to: Firebase Console → Project Settings → Service Accounts
  2. Click "Generate new private key" and download the JSON
  3. Save it to:  web/scripts/serviceAccountKey.json
     — OR —
     Set:  GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

Then re-run:  node scripts/seed-case-studies.mjs
`);
  process.exit(1);
}

admin.initializeApp({
  credential,
  projectId: "claudebuilderclubpsu",
});

const db = admin.firestore();
const FORCE = process.argv.includes("--force");

// ── Seed data ─────────────────────────────────────────────────────────────────

const caseStudies = [
  // ── Club Collaborations ───────────────────────────────────────────────────────
  {
    id: "nittany-ai-vibe-a-thon",
    type: "club",
    orgName: "Nittany AI Student Society & Nittany AI Alliance",
    orgType: "Student Organizations",
    title: "Claude + Nittany AI Challenge Vibe-a-thon",
    semester: "Spring 2025",
    description:
      "Partnered with Nittany AI Student Society and Nittany AI Alliance to host a \"vibe-a-thon\" where Nittany AI Challenge participants used Claude and other AI tools to jumpstart their MVP submissions. Participants competed for $400 in Claude API credits, networked with fellow innovators, and refined their project roadmaps.",
    outcomes: [
      "50+ students participated across organizations",
      "5 early-stage MVPs accelerated with Claude API",
      "Cross-org networking led to 3 new team formations",
      "$400 API credits awarded to top submissions",
      "Demonstrated Claude's value in rapid prototyping workflows",
    ],
    tools: ["Claude API", "Claude.ai", "MVP Development", "Rapid Prototyping"],
    studentCount: 50,
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
    featured: true,
    order: 10,
    published: true,
  },

  // ── Academic Integrations ─────────────────────────────────────────────────────
  {
    id: "ist-101-intro-module",
    type: "academic",
    course: "IST 101",
    courseTitle: "Information, People, and Technology",
    professor: "Dr. Sarah Johnson",
    department: "College of IST",
    title: "AI Ethics and Responsible Tool Use",
    semester: "Fall 2024",
    description:
      "Integrated a 4-week Claude-focused module into IST 101 where students explored how AI systems work, ethical considerations in deployment, and responsible use patterns. Students built small projects—writing assistants, data summarizers—while discussing impact and bias.",
    outcomes: [
      "200+ students completed AI ethics module",
      "100% of surveyed students felt more confident using AI responsibly",
      "8 student projects showcased Claude's practical applications",
      "Integration adopted as permanent part of curriculum",
    ],
    tools: ["Claude API", "Prompt Engineering", "AI Ethics", "Responsible AI"],
    studentCount: 200,
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
    featured: true,
    order: 20,
    published: true,
  },
];

// ── Writer ────────────────────────────────────────────────────────────────────

async function seedCaseStudies() {
  console.log(
    `\n🌱  Seeding ${caseStudies.length} case studies into Firestore...`
  );
  console.log(`    Mode: ${FORCE ? "FORCE (overwrite)" : "safe (skip existing)"}\n`);

  let written = 0;
  let skipped = 0;
  let errors = 0;

  for (const { id, ...data } of caseStudies) {
    const ref = db.collection("case-studies").doc(id);
    try {
      if (!FORCE) {
        const snap = await ref.get();
        if (snap.exists) {
          console.log(`  ⏭  skip   ${id}`);
          skipped++;
          continue;
        }
      }
      await ref.set(data);
      console.log(`  ✓  wrote  ${id}`);
      written++;
    } catch (err) {
      console.error(`  ✗  error  ${id}:`, err.message);
      errors++;
    }
  }

  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`  Written : ${written}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Errors  : ${errors}`);
  console.log(`─────────────────────────────────────────\n`);

  if (errors > 0) process.exit(1);
}

seedCaseStudies();
