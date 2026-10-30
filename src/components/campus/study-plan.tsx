"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Loader2, Map, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api, fmtDate } from "@/lib/campus-client";
import type { RoleTheme, StudyPlanRow } from "@/lib/campus-types";
import { cn } from "@/lib/utils";

export function StudyPlanPanel({
  studentId,
  theme,
  subjects,
  plans,
  onRefresh,
  compact,
}: {
  studentId: string;
  theme: RoleTheme;
  subjects: string[];
  plans: StudyPlanRow[];
  onRefresh: () => void;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const [goal, setGoal] = useState("");
  const [hours, setHours] = useState("2");
  const [focus, setFocus] = useState("");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<StudyPlanRow | null>(plans[0] ?? null);
  const [list, setList] = useState<StudyPlanRow[]>(plans);

  async function generate() {
    if (!goal.trim()) {
      toast({ title: "Tell me your goal first ✏️", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ studyPlan: StudyPlanRow }>("/api/studyplans", {
        method: "POST",
        body: JSON.stringify({ studentId, goal, hoursPerDay: Number(hours), focusSubjects: focus, days: Number(days) }),
      });
      setList((l) => [data.studyPlan, ...l]);
      setActive(data.studyPlan);
      setGoal("");
      onRefresh();
      toast({ title: "🗺️ Study plan ready!", description: data.studyPlan.title });
    } catch (e) {
      toast({ title: "Could not generate plan", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/studyplans?id=${id}`, { method: "DELETE" });
      setList((l) => l.filter((p) => p.id !== id));
      if (active?.id === id) setActive(null);
      toast({ title: "Plan deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className={cn("grid gap-5", compact ? "" : "lg:grid-cols-5")}>
      {/* Generator form */}
      <Card className={cn("border-0 shadow-lg", compact ? "" : "lg:col-span-2 h-fit")}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Map className={cn("h-5 w-5", theme.text)} /> AI Study Plan Generator
          </CardTitle>
          <p className="text-sm text-gray-500">Set a goal — get a day-wise plan tuned to your weakest subjects.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal">Your goal</Label>
            <Input
              id="goal"
              placeholder="e.g. Score 90% in Physics midterm"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hours">Hours / day</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger id="hours" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((h) => (
                    <SelectItem key={h} value={h}>{h} h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="days">Plan length</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger id="days" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["5", "7", "10", "14"].map((d) => (
                    <SelectItem key={d} value={d}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="focus">Extra focus subjects (optional)</Label>
            <Input
              id="focus"
              placeholder={subjects.slice(0, 2).join(", ") || "e.g. Mathematics, Physics"}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="h-11"
            />
            {subjects.length > 0 && <p className="text-xs text-gray-400">Class subjects: {subjects.join(", ")}</p>}
          </div>
          <Button onClick={generate} disabled={busy} className={cn("w-full h-11 rounded-xl font-semibold", theme.button)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Designing your plan…" : "Generate Plan"}
          </Button>
        </CardContent>
      </Card>

      {/* Plans list + viewer */}
      <div className={cn("space-y-4", compact ? "" : "lg:col-span-3")}>
        {list.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className={cn(
                  "shrink-0 rounded-2xl border px-3.5 py-2.5 text-left text-xs transition hover:shadow-md",
                  active?.id === p.id ? cn("border-transparent text-white bg-gradient-to-br", theme.statGradients[0]) : "bg-white text-gray-600"
                )}
              >
                <div className="font-semibold line-clamp-1 max-w-44">{p.title}</div>
                <div className={cn("mt-0.5 flex items-center gap-1", active?.id === p.id ? "opacity-80" : "text-gray-400")}>
                  <CalendarClock className="h-3 w-3" /> {fmtDate(p.createdAt)}
                </div>
              </button>
            ))}
          </div>
        )}

        {busy && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-10 text-center space-y-3">
              <Loader2 className={cn("h-10 w-10 animate-spin mx-auto", theme.text)} />
              <p className="text-sm text-gray-500">Balancing subjects, breaks & quizzes…</p>
            </CardContent>
          </Card>
        )}

        {!busy && active && (
          <Card className="border-0 shadow-lg relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3 h-8 w-8 text-gray-300 hover:text-rose-500"
              onClick={() => remove(active.id)}
              aria-label="Delete plan"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <ScrollArea className="max-h-[520px]">
              <CardContent className="p-6 prose prose-sm prose-headings:mb-2 prose-headings:mt-4 prose-p:my-1 prose-li:my-0.5 max-w-none">
                <ReactMarkdown>{active.content}</ReactMarkdown>
              </CardContent>
            </ScrollArea>
          </Card>
        )}

        {!busy && !active && list.length === 0 && (
          <Card className="border-0 shadow-lg border-dashed">
            <CardContent className="p-10 text-center text-sm text-gray-400">
              <div className="text-4xl mb-2">🗺️</div>
              No study plans yet — generate your first one!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
