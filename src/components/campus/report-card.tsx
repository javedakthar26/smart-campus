"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Award, FileText, Loader2, Sparkles } from "lucide-react";
import { api, fmtDate } from "@/lib/campus-client";
import { EXAM_OPTIONS, type ReportCardRow, type RoleTheme, type SessionUser } from "@/lib/campus-types";
import { cn } from "@/lib/utils";

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-emerald-500", A: "bg-emerald-400", "B+": "bg-amber-400", B: "bg-amber-500", C: "bg-orange-400", D: "bg-rose-400", F: "bg-rose-500",
};

// ───────────── View a saved report card ─────────────
export function ReportCardView({ card, studentName, className }: { card: ReportCardRow; studentName: string; className?: string }) {
  return (
    <Card className={cn("overflow-hidden border-0 shadow-xl", className)}>
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Smart Campus · Official Report</div>
            <div className="text-xl font-black">{card.exam}</div>
            <div className="text-sm opacity-90">{studentName} · generated {fmtDate(card.createdAt)}</div>
          </div>
          <div className="text-center">
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg", GRADE_COLORS[card.grade] ?? "bg-gray-400")}>
              {card.grade}
            </div>
            <div className="text-[10px] mt-1 opacity-80">GRADE</div>
          </div>
        </div>
      </div>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 p-4 text-center">
            <div className="text-3xl font-black text-orange-600">{card.percentage}%</div>
            <div className="text-xs text-orange-500 font-medium">Overall Percentage</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 p-4 text-center">
            <div className="text-3xl font-black text-teal-600">{card.gpa.toFixed(1)}</div>
            <div className="text-xs text-teal-600 font-medium">GPA (4.0 scale)</div>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 mb-2">
            <Sparkles className="h-3.5 w-3.5" /> AI TEACHER REMARKS
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{card.remarks}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ───────────── Generator panel (teacher/admin) ─────────────
export function ReportGenerator({
  students,
  theme,
  user,
  onGenerated,
}: {
  students: { id: string; name: string; rollNo: string; className: string }[];
  theme: RoleTheme;
  user: SessionUser;
  onGenerated?: () => void;
}) {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [exam, setExam] = useState(EXAM_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ card: ReportCardRow; name: string } | null>(null);
  const [saved, setSaved] = useState<ReportCardRow[]>([]);

  const canGenerate = user.role === "ADMIN" || user.role === "TEACHER";

  async function generate() {
    if (!studentId) {
      toast({ title: "Pick a student first", variant: "destructive" });
      return;
    }
    setBusy(true);
    setPreview(null);
    try {
      const data = await api<{ reportCard: ReportCardRow }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ studentId, exam }),
      });
      const name = students.find((s) => s.id === studentId)?.name ?? "Student";
      setPreview({ card: data.reportCard, name });
      setSaved((s) => [data.reportCard, ...s.filter((c) => !(c.exam === data.reportCard.exam))]);
      onGenerated?.();
      toast({ title: "🎉 Report card generated!", description: `${exam} — ${name}` });
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {canGenerate && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className={cn("h-5 w-5", theme.text)} /> Auto Report Card Generator
            </CardTitle>
            <p className="text-sm text-gray-500">
              Pick a student & exam — Smart Campus calculates totals, grade & GPA, then writes teacher remarks with AI.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="h-11 flex-1">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.rollNo} · {s.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exam} onValueChange={setExam}>
              <SelectTrigger className="h-11 sm:w-44">
                <SelectValue placeholder="Exam" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={busy} className={cn("h-11 rounded-xl font-semibold", theme.button)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Generating…" : "Generate"}
            </Button>
          </CardContent>
        </Card>
      )}

      {busy && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center space-y-3">
            <Loader2 className={cn("h-10 w-10 animate-spin mx-auto", theme.text)} />
            <p className="text-sm text-gray-500">Crunching marks · computing grade · writing remarks with AI…</p>
          </CardContent>
        </Card>
      )}

      {preview && !busy && <ReportCardView card={preview.card} studentName={preview.name} />}

      {saved.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Recently generated in this session
          </div>
          <div className="flex flex-wrap gap-2">
            {saved.map((c) => (
              <Badge key={c.id + c.exam} variant="secondary" className={cn("rounded-full px-3 py-1.5", theme.chip)}>
                {c.exam} · {c.percentage}% · {c.grade}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
