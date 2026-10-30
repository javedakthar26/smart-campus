"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { api } from "@/lib/campus-client";
import type { ChatMsg, Role, SessionUser } from "@/lib/campus-types";
import type { RoleTheme } from "@/lib/campus-theme";
import { cn } from "@/lib/utils";

const SUGGESTIONS: Record<Role, string[]> = {
  ADMIN: ["How many students are enrolled?", "Which class has the highest strength?", "Give me a campus summary"],
  TEACHER: ["How do I mark attendance?", "Suggest an activity to teach fractions", "How do I generate report cards?"],
  STUDENT: ["How is my attendance?", "Which subject am I weakest in?", "Give me 3 quick exam tips"],
  PARENT: ["How is my child performing?", "What is the attendance policy?", "How can I help my child study at home?"],
};

export function AIAssistant({ user, theme }: { user: SessionUser; theme: RoleTheme }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api<{ history: ChatMsg[] }>("/api/ai/chat");
      setMessages(data.history);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (open && !loaded) loadHistory();
  }, [open, loaded, loadHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: msg }]);
    setBusy(true);
    try {
      const data = await api<{ reply: ChatMsg }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      });
      setMessages((m) => [...m, data.reply]);
    } catch (e) {
      toast({ title: "AI is unavailable", description: (e as Error).message, variant: "destructive" });
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: "assistant", content: "Sorry — I hit a snag. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  async function clearChat() {
    try {
      await api("/api/ai/chat", { method: "DELETE" });
      setMessages([]);
      setLoaded(false);
      toast({ title: "Chat cleared" });
    } catch (e) {
      toast({ title: "Could not clear", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI assistant"
        className={cn(
          "fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br",
          theme.statGradients[0],
          "flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 animate-pulse" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[520px] max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl border bg-white flex flex-col animate-in slide-in-from-bottom-4">
          <div className={cn("bg-gradient-to-r p-4 text-white flex items-center gap-3", theme.gradient)}>
            <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Campus Pal</div>
              <div className="text-xs opacity-90">AI assistant — clears your queries 24×7</div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={clearChat} aria-label="Clear chat">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3 pr-2">
              {loaded && messages.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-6 space-y-3">
                  <div className="text-4xl">👋</div>
                  <div>Hi {user.name.split(" ")[0]}! Ask me anything about campus.</div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {SUGGESTIONS[user.role].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className={cn("text-xs rounded-full px-3 py-1.5 border hover:scale-105 transition", theme.chip)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                      m.role === "user"
                        ? cn("bg-gradient-to-br text-white rounded-br-md", theme.statGradients[0])
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Campus Pal is thinking…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 border-t flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="h-11 rounded-xl"
              aria-label="Message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !input.trim()}
              className={cn("h-11 w-11 rounded-xl shrink-0 bg-gradient-to-br", theme.statGradients[0])}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
