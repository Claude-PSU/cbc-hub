/**
 * seed-resources.mjs  —  Firebase Admin SDK seeder
 * ─────────────────────────────────────────────────
 * Run from /web:
 *   node scripts/seed-resources.mjs
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

Then re-run:  node scripts/seed-resources.mjs
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

const resources = [
  // ── Getting Started ──────────────────────────────────────────────────────────
  {
    id: "claude-101",
    title: "Claude 101: Your First Conversation",
    description:
      "A practical walkthrough of Claude's capabilities, interface, and safe usage guidelines. No prior AI experience required — just curiosity.",
    type: "link",
    href: "https://claude.ai",
    category: "getting-started",
    audience: "student",
    techLevels: ["beginner"],
    tags: ["intro", "claude", "beginner"],
    featured: true,
    order: 10,
    published: true,
  },
  {
    id: "what-is-an-llm",
    title: "What is a Large Language Model?",
    description:
      "A friendly, non-technical explanation of how models like Claude actually work — tokens, context, and why prompts matter. Great starting point for the truly curious.",
    type: "link",
    href: "https://www.anthropic.com/research/core-views-on-ai-safety",
    category: "getting-started",
    audience: "all",
    techLevels: ["beginner"],
    tags: ["intro", "llm", "how-it-works"],
    featured: true,
    order: 20,
    published: true,
  },
  {
    id: "claude-use-cases",
    title: "50 Things You Can Do with Claude",
    description:
      "From essay feedback to data analysis to brainstorming — a curated list of practical use cases students at Penn State have found useful.",
    type: "link",
    href: "https://www.anthropic.com/claude",
    category: "getting-started",
    audience: "student",
    techLevels: ["beginner", "some"],
    tags: ["use-cases", "productivity", "student"],
    featured: true,
    order: 30,
    published: true,
  },
  {
    id: "ai-fluency-foundations",
    title: "AI Fluency: Framework & Foundations (Free Course)",
    description:
      "Anthropic's free self-paced course teaching the 4D AI Fluency Framework — how to collaborate with AI effectively, efficiently, ethically, and safely. Suitable for all skill levels; earn a certificate on completion.",
    type: "link",
    href: "https://anthropic.skilljar.com/ai-fluency-framework-foundations",
    category: "getting-started",
    audience: "all",
    techLevels: ["beginner", "some", "intermediate", "advanced"],
    tags: ["course", "certificate", "ai-fluency", "anthropic", "free"],
    featured: true,
    order: 25,
    published: true,
  },
  {
    id: "ai-fluency-students",
    title: "AI Fluency for Students (Free Course)",
    description:
      "Built on the 4D AI Fluency Framework, this Anthropic course helps students enhance learning, career planning, and academic success through responsible AI collaboration. Earn a certificate on completion.",
    type: "link",
    href: "https://anthropic.skilljar.com/ai-fluency-for-students",
    category: "getting-started",
    audience: "student",
    techLevels: ["beginner", "some"],
    tags: ["course", "certificate", "students", "ai-fluency", "anthropic"],
    featured: true,
    order: 35,
    published: true,
  },
  {
    id: "responsible-use-guide",
    title: "Using AI Responsibly at Penn State",
    description:
      "Academic integrity, citation norms, and ethical considerations for students using AI tools in coursework. Includes PSU-specific policy guidance.",
    type: "link",
    href: "https://www.psu.edu/this-is-penn-state/university-policy-manual/",
    category: "getting-started",
    audience: "student",
    techLevels: ["beginner", "some", "intermediate", "advanced"],
    tags: ["ethics", "policy", "academic-integrity"],
    featured: false,
    order: 40,
    published: true,
  },

  // ── Prompt Engineering ───────────────────────────────────────────────────────
  {
    id: "prompt-engineering-101",
    title: "Prompt Engineering 101",
    description:
      "Anthropic's official introduction to prompt engineering. Covers the basics of crafting clear, effective instructions — roles, context, formatting, and output specification.",
    type: "link",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview",
    category: "prompt-engineering",
    audience: "student",
    techLevels: ["beginner", "some"],
    tags: ["prompt-engineering", "basics", "anthropic"],
    featured: true,
    order: 100,
    published: true,
  },
  {
    id: "chain-of-thought",
    title: "Chain of Thought Prompting",
    description:
      "Learn how to ask Claude to reason step-by-step. Chain-of-thought techniques dramatically improve accuracy on math, logic, and complex analysis tasks.",
    type: "link",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought",
    category: "prompt-engineering",
    audience: "student",
    techLevels: ["some", "intermediate"],
    tags: ["chain-of-thought", "reasoning", "technique"],
    featured: true,
    order: 110,
    published: true,
  },
  {
    id: "system-prompts-guide",
    title: "Writing Effective System Prompts",
    description:
      "System prompts set the stage for every Claude interaction. This guide covers persona, tone, scope constraints, and formatting instructions to shape Claude's behavior.",
    type: "link",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts",
    category: "prompt-engineering",
    audience: "student",
    techLevels: ["some", "intermediate", "advanced"],
    tags: ["system-prompt", "persona", "configuration"],
    featured: false,
    order: 120,
    published: true,
  },
  {
    id: "few-shot-examples",
    title: "Few-Shot Prompting with Examples",
    description:
      "Show Claude what you want by providing examples in the prompt itself. Especially useful for formatting outputs, writing in a specific style, or custom classification tasks.",
    type: "link",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-examples",
    category: "prompt-engineering",
    audience: "student",
    techLevels: ["some", "intermediate"],
    tags: ["few-shot", "examples", "in-context-learning"],
    featured: false,
    order: 130,
    published: true,
  },

  // ── Workshops ────────────────────────────────────────────────────────────────
  {
    id: "workshop-nextjs-boilerplate",
    title: "Next.js + Claude Starter Template",
    description:
      "Production-ready boilerplate used in our API Quickstart workshop. Includes streaming responses, basic prompt UI, and environment variable setup out of the box.",
    type: "link",
    href: "https://github.com/Claude-PSU",
    category: "workshops",
    audience: "student",
    techLevels: ["some", "intermediate"],
    tags: ["boilerplate", "next.js", "starter", "github"],
    featured: true,
    order: 230,
    published: true,
  },

  // ── For Faculty ──────────────────────────────────────────────────────────────
  {
    id: "faculty-classroom-integration",
    title: "Integrating Claude into Your Classroom",
    description:
      "A practical guide for instructors on designing assignments that incorporate Claude meaningfully — from structured research tasks to peer-review assistants and writing feedback tools.",
    type: "link",
    href: "https://www.anthropic.com/education",
    category: "faculty",
    audience: "faculty",
    techLevels: ["beginner", "some"],
    tags: ["classroom", "assignments", "pedagogy", "faculty"],
    featured: true,
    order: 310,
    published: true,
  },
  {
    id: "ai-fluency-educators",
    title: "AI Fluency for Educators (Free Course)",
    description:
      "Anthropic's course for faculty and instructional designers on applying AI fluency in teaching practice and institutional strategy. Builds on the 4D Framework; earn a certificate on completion.",
    type: "link",
    href: "https://anthropic.skilljar.com/ai-fluency-for-educators",
    category: "faculty",
    audience: "faculty",
    techLevels: ["beginner", "some", "intermediate", "advanced"],
    tags: ["course", "certificate", "faculty", "ai-fluency", "anthropic"],
    featured: true,
    order: 315,
    published: true,
  },
  {
    id: "teaching-ai-fluency",
    title: "Teaching AI Fluency (Free Course)",
    description:
      "For faculty who want to teach AI competency to their own students — covers the 4D AI Fluency Framework and provides assessment tools and curriculum guidance. Certificate available.",
    type: "link",
    href: "https://anthropic.skilljar.com/teaching-ai-fluency",
    category: "faculty",
    audience: "faculty",
    techLevels: ["some", "intermediate", "advanced"],
    tags: ["course", "certificate", "teaching", "pedagogy", "ai-fluency"],
    featured: false,
    order: 317,
    published: true,
  },
  {
    id: "claude-for-education",
    title: "Claude for Education",
    description:
      "Anthropic's dedicated page for higher education institutions — how universities across the country are adopting Claude responsibly, plus how to engage Anthropic's education team for your institution.",
    type: "link",
    href: "https://claude.com/solutions/education",
    category: "faculty",
    audience: "faculty",
    techLevels: ["beginner", "some", "intermediate", "advanced"],
    tags: ["education", "institutions", "anthropic", "higher-ed"],
    featured: false,
    order: 325,
    published: true,
  },

  // ── Reference & Docs ─────────────────────────────────────────────────────────
  {
    id: "claude-api-docs",
    title: "Claude API Documentation",
    description:
      "The official Anthropic reference for the Claude API — messages endpoint, model IDs, tool use, streaming, and rate limits. Bookmark this.",
    type: "link",
    href: "https://docs.anthropic.com/en/api",
    category: "reference",
    audience: "student",
    techLevels: ["intermediate", "advanced"],
    tags: ["api", "reference", "docs", "anthropic"],
    featured: true,
    order: 400,
    published: true,
  },
  {
    id: "claude-model-overview",
    title: "Claude Model Family Overview",
    description:
      "Comparison of Haiku, Sonnet, and Opus — speed vs. capability trade-offs, context windows, and when to use each model in your project.",
    type: "link",
    href: "https://docs.anthropic.com/en/docs/about-claude/models",
    category: "reference",
    audience: "student",
    techLevels: ["some", "intermediate", "advanced"],
    tags: ["models", "haiku", "sonnet", "opus", "comparison"],
    featured: false,
    order: 410,
    published: true,
  },
  {
    id: "anthropic-usage-policy",
    title: "Anthropic Usage Policy",
    description:
      "The official policy governing acceptable use of Claude — content restrictions, safety guidelines, and responsible deployment expectations for builders.",
    type: "link",
    href: "https://www.anthropic.com/legal/aup",
    category: "reference",
    audience: "all",
    techLevels: ["beginner", "some", "intermediate", "advanced"],
    tags: ["policy", "safety", "legal", "compliance"],
    featured: false,
    order: 420,
    published: true,
  },
  {
    id: "tool-use-guide",
    title: "Tool Use (Function Calling) Guide",
    description:
      "How to give Claude access to external tools — defining tool schemas, handling tool_use blocks, and building reliable agentic workflows.",
    type: "link",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
    category: "reference",
    audience: "student",
    techLevels: ["intermediate", "advanced"],
    tags: ["tool-use", "function-calling", "agents", "advanced"],
    featured: false,
    order: 430,
    published: true,
  },

  // ── Further Reading ───────────────────────────────────────────────────────────
  {
    id: "one-useful-thing",
    title: "One Useful Thing (Ethan Mollick)",
    description:
      "Wharton professor Ethan Mollick's newsletter on AI in education and work. Consistently one of the best practical takes on how AI changes learning and productivity.",
    type: "link",
    href: "https://www.oneusefulthing.org",
    category: "external",
    audience: "all",
    techLevels: ["beginner", "some", "intermediate", "advanced"],
    tags: ["newsletter", "education", "ai-at-work", "recommended"],
    featured: true,
    order: 500,
    published: true,
  },
  {
    id: "attention-all-you-need",
    title: "Attention Is All You Need (Original Transformer Paper)",
    description:
      "The 2017 Google Brain paper that introduced the Transformer architecture underlying all modern LLMs including Claude. Worth reading once you're comfortable with the basics.",
    type: "link",
    href: "https://arxiv.org/abs/1706.03762",
    category: "external",
    audience: "student",
    techLevels: ["advanced"],
    tags: ["research", "transformers", "deep-learning", "foundational"],
    featured: false,
    order: 510,
    published: true,
  },
  {
    id: "ai-safety-primer",
    title: "AI Safety: An Introduction",
    description:
      "A clear, non-alarmist intro to AI safety concepts — alignment, capability overhang, and why Anthropic's Constitutional AI approach matters. Written for a general audience.",
    type: "link",
    href: "https://www.anthropic.com/research",
    category: "external",
    audience: "all",
    techLevels: ["beginner", "some"],
    tags: ["ai-safety", "alignment", "ethics", "anthropic"],
    featured: false,
    order: 520,
    published: true,
  },
  {
    id: "learnprompting-guide",
    title: "Learn Prompting (Open Source Guide)",
    description:
      "Community-maintained guide covering prompt engineering techniques from zero-shot to advanced agentic patterns. Free, comprehensive, and regularly updated.",
    type: "link",
    href: "https://learnprompting.org",
    category: "external",
    audience: "student",
    techLevels: ["beginner", "some", "intermediate"],
    tags: ["prompt-engineering", "guide", "open-source", "learning"],
    featured: false,
    order: 530,
    published: true,
  },
];

// ── Writer ────────────────────────────────────────────────────────────────────

async function seedResources() {
  console.log(`\n🌱  Seeding ${resources.length} resources into Firestore...`);
  console.log(`    Mode: ${FORCE ? "FORCE (overwrite)" : "safe (skip existing)"}\n`);

  let written = 0;
  let skipped = 0;
  let errors = 0;

  for (const { id, ...data } of resources) {
    const ref = db.collection("resources").doc(id);
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

seedResources();
