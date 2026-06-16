import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MessageCircle, X, Send } from "lucide-react";

export function TeamFairnessBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; text: string }>>([
    {
      role: "bot",
      text: "Hi! 👋 I'm here to answer questions about team fairness and how teams were assigned. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askBotMutation = trpc.system.askTeamFairnessBot.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await askBotMutation.mutateAsync({ message: userMessage });
      setMessages((prev) => [...prev, { role: "bot", text: response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-[#FF5500] hover:bg-[#FF6B1A] text-white rounded-full p-4 shadow-lg transition-all z-40"
        aria-label="Open team fairness chatbot"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-96 bg-[#1A1A1A] border-[#FF5500] flex flex-col shadow-xl z-40">
          {/* Header */}
          <div className="bg-[#FF5500] text-white p-4 rounded-t-lg">
            <h3 className="font-bebas text-lg">Team Fairness Bot</h3>
            <p className="text-xs text-orange-100">Ask about team assignment</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-[#FF5500] text-white rounded-br-none"
                      : "bg-[#2A2A2A] text-[#CCC] rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#2A2A2A] text-[#999] px-3 py-2 rounded-lg text-sm rounded-bl-none">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-[#333] p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about teams..."
              disabled={isLoading}
              className="bg-[#2A2A2A] border-[#444] text-white placeholder-[#666]"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="bg-[#FF5500] hover:bg-[#FF6B1A]"
            >
              <Send size={16} />
            </Button>
          </form>
        </Card>
      )}
    </>
  );
}
