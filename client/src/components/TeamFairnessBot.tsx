import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MessageCircle, X, Send } from "lucide-react";

export function TeamFairnessBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; text: string }>>([
    {
      role: "bot",
      text: "Hey! 👋 I'm your Sports Day 002 assistant. Ask me anything — schedule, events, rules, teams, logistics, or how to get there!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askBotMutation = trpc.system.askTeamFairnessBot.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await askBotMutation.mutateAsync({ message: userMessage });
      setMessages((prev) => [...prev, { role: "bot", text: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I hit an error. Try again in a moment!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[9999] bg-[#FF5500] hover:bg-[#FF6B1A] text-white rounded-full p-4 shadow-2xl transition-all active:scale-95"
        aria-label={isOpen ? "Close chatbot" : "Open Sports Day assistant"}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat window — mobile-safe sizing */}
      {isOpen && (
        <div
          className="fixed z-[9998] flex flex-col bg-[#111] border border-[#FF5500]/60 shadow-2xl"
          style={{
            /* On mobile: full width minus margins, capped height */
            bottom: "80px",
            right: "12px",
            left: "12px",
            maxWidth: "420px",
            /* Push left edge right on wider screens */
            marginLeft: "auto",
            height: "min(520px, calc(100dvh - 100px))",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#FF5500] px-4 py-3 flex-shrink-0">
            <div>
              <p className="font-bebas text-white text-lg leading-none tracking-wide">SPORTS DAY ASSISTANT</p>
              <p className="font-mono text-orange-100 text-[10px] tracking-wider">Ask anything about the event</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#FF5500] text-white rounded-2xl rounded-br-sm"
                      : "bg-[#1E1E1E] text-[#DDD] rounded-2xl rounded-bl-sm border border-[#2A2A2A]"
                  }`}
                  style={{ wordBreak: "break-word" }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1E1E1E] text-[#888] px-3 py-2 rounded-2xl rounded-bl-sm text-sm border border-[#2A2A2A]">
                  <span className="animate-pulse">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[#222] px-3 py-3 flex gap-2 flex-shrink-0 bg-[#0D0D0D]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the schedule, rules, teams…"
              disabled={isLoading}
              className="flex-1 bg-[#1A1A1A] border border-[#333] text-white placeholder-[#555] font-mono text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF5500] min-w-0"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#FF5500] hover:bg-[#FF6B1A] disabled:opacity-40 text-white rounded-lg px-3 py-2 transition-colors flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
