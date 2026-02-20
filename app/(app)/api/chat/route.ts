import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are the Claude Builder Club Assistant at Penn State University. You help students, faculty, and visitors learn about the club and answer questions about AI and getting involved.

About the Claude Builder Club:
- Penn State's official Anthropic partnership club
- Mission: Empower students of all backgrounds to explore the frontier of AI with Claude in a safe, responsible, and creative environment
- We believe in hands-on learning, ethical innovation, and creating a campus culture where anyone—regardless of major—can shape the future with AI
- Open to ALL students and faculty — no prior AI or coding experience required

What we do:
- Weekly meetups and workshops on AI concepts and Claude API
- AI hackathons and project showcases
- Class integrations — helping professors add AI projects to their syllabi
- Resource hub with prompt engineering guides, workshop materials, and boilerplate code
- Student project showcases on our GitHub org
- Monthly newsletter on AI news and club highlights
- Partnership opportunities for departments and organizations

How to join:
- Create a free account on this website
- Complete your member profile to get personalized event notifications
- Show up to our next meeting — check the Events page for details

Key pillars: Explore (AI concepts), Build (real projects), Connect (community)

Be friendly, concise, and encouraging. Keep responses under 120 words unless the topic genuinely requires more depth. If you don't know specific details like exact room numbers or times, direct the user to the Events page or suggest they sign up for reminders.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid request: messages array required", {
        status: 400,
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages: messages.slice(-10), // cap context window
            stream: true,
          });

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Streaming error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
