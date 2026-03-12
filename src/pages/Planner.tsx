import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { format, eachDayOfInterval, addDays } from "date-fns";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const } },
};

const Planner = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [examDate, setExamDate] = useState("");

  const loadData = async () => {
    if (!user) return;
    const { data: subs } = await supabase.from("subjects").select("*").eq("user_id", user.id).order("created_at");
    setSubjects(subs || []);
    const { data: exs } = await supabase
      .from("exams")
      .select("*, subjects(name)")
      .eq("user_id", user.id)
      .order("exam_date");
    setExams(exs || []);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const addSubject = async () => {
    if (!newSubject.trim() || !user) return;
    const { error } = await supabase.from("subjects").insert({ name: newSubject.trim(), user_id: user.id });
    if (error) return toast.error(error.message);
    setNewSubject("");
    toast.success("Subject added!");
    loadData();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Subject deleted");
    loadData();
  };

  const addExam = async () => {
    if (!selectedSubject || !examDate || !user) return;
    const { error } = await supabase.from("exams").insert({
      subject_id: selectedSubject,
      exam_date: examDate,
      user_id: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Exam scheduled!");
    setExamDate("");
    loadData();
  };

  const generateTasks = async (examId: string, subjectId: string, examDateStr: string) => {
    if (!user) return;
    const subj = subjects.find((s) => s.id === subjectId);
    const today = new Date();
    const end = addDays(new Date(examDateStr), -1);
    if (end <= today) return toast.error("Exam date must be in the future");

    const days = eachDayOfInterval({ start: addDays(today, 1), end });
    const tasks = days.map((day, i) => ({
      title: `${subj?.name || "Study"} - Day ${i + 1} review`,
      due_date: format(day, "yyyy-MM-dd"),
      subject_id: subjectId,
      user_id: user.id,
      status: "pending" as const,
    }));

    const { error } = await supabase.from("tasks").insert(tasks);
    if (error) return toast.error(error.message);
    toast.success(`${tasks.length} study tasks generated!`);
  };

  const deleteExam = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Exam deleted");
    loadData();
  };

  return (
    <AppLayout>
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-6">
        <motion.h1 variants={item} className="text-3xl font-semibold tracking-tight">
          Study Planner
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={item}>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Subjects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Math 101"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  />
                  <Button onClick={addSubject} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <AnimatePresence>
                  {subjects.map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors duration-150"
                    >
                      <span className="text-sm font-medium">{s.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => deleteSubject(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Add your first subject to get started.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Schedule Exam
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Exam Date</Label>
                  <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                </div>
                <Button onClick={addExam} className="w-full" disabled={!selectedSubject || !examDate}>
                  Schedule Exam
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={item}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Scheduled Exams</CardTitle>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No exams scheduled yet.</p>
              ) : (
                <div className="space-y-3">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors duration-150"
                    >
                      <div>
                        <p className="text-sm font-medium">{exam.subjects?.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {format(new Date(exam.exam_date), "MMMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => generateTasks(exam.id, exam.subject_id, exam.exam_date)}
                        >
                          Generate Tasks
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteExam(exam.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
};

export default Planner;
