"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What is the Claude Builder Club?",
  "When is the next meeting?",
  "How do I get involved?",
  "What resources are available for beginners?",
];

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function PromptBox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSubmit = async (text?: string) => {
    const userMessage = text || input;
    if (!userMessage.trim() || isLoading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setStreamingText(fullText);
              }
            } catch {
              // ignore parse errors on incomplete chunks
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullText },
      ]);
      setStreamingText("");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
      setStreamingText("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setStreamingText("");
    setInput("");
    inputRef.current?.focus();
  };

  const hasConversation = messages.length > 0 || !!streamingText;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Conversation history */}
      {hasConversation && (
        <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 max-h-64 overflow-y-auto space-y-3 text-left">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#1E407C] text-white"
                    : "bg-white/10 text-[#F0EDE8]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed bg-white/10 text-[#F0EDE8]">
                {streamingText}
                <span className="inline-block w-0.5 h-4 bg-[#d97757] ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          )}

          {isLoading && !streamingText && (
            <div className="flex justify-start">
              <div className="px-4 py-2.5 rounded-xl bg-white/10">
                <Loader2 size={14} className="text-[#d97757] animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="relative flex items-center bg-white/10 border border-white/20 rounded-2xl backdrop-blur-sm focus-within:border-[#d97757]/60 focus-within:bg-white/15 transition-all duration-200">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ask anything about the club…"
          disabled={isLoading}
          className="flex-1 bg-transparent px-5 py-4 text-white placeholder-[#8B95A8] text-sm outline-none disabled:opacity-50"
        />
        <div className="flex items-center gap-2 pr-3">
          {hasConversation && (
            <button
              onClick={handleReset}
              className="p-2 rounded-lg text-[#8B95A8] hover:text-white hover:bg-white/10 transition-colors"
              title="Start new conversation"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-[#d97757] hover:bg-[#c86843] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {isLoading ? (
              <Loader2 size={16} className="text-[#0D1B3E] animate-spin" />
            ) : (
              <ArrowRight size={16} className="text-[#0D1B3E]" />
            )}
          </button>
        </div>
      </div>

      {/* Suggested prompts */}
      {!hasConversation && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSubmit(prompt)}
              className="px-3 py-1.5 text-xs text-[#C0C8D8] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
