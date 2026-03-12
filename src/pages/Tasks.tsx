import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const loadData = async () => {
    if (!user) return;
    const { data: t } = await supabase
      .from("tasks")
      .select("*, subjects(name)")
      .eq("user_id", user.id)
      .order("due_date");
    setTasks(t || []);
    const { data: s } = await supabase.from("subjects").select("*").eq("user_id", user.id);
    setSubjects(s || []);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const addTask = async () => {
    if (!newTitle.trim() || !newDate || !newSubject || !user) return;
    const { error } = await supabase.from("tasks").insert({
      title: newTitle.trim(),
      due_date: newDate,
      subject_id: newSubject,
      user_id: user.id,
    });
    if (error) return toast.error(error.message);
    setNewTitle("");
    setNewDate("");
    toast.success("Task created!");
    loadData();
  };

  const toggleTask = async (id: string, current: string) => {
    const newStatus = current === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    loadData();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    loadData();
  };

  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);

  return (
    <AppLayout>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="space-y-6"
      >
        <motion.h1
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          className="text-3xl font-semibold tracking-tight"
        >
          Task Manager
        </motion.h1>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Add Task</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <Select value={newSubject} onValueChange={setNewSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input placeholder="Review Chapter 3 notes" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button onClick={addTask} className="w-full" disabled={!newTitle || !newDate || !newSubject}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex gap-2">
          {(["all", "pending", "completed"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {filter === "all"
                  ? "No tasks yet. Create one above or generate from the planner."
                  : `No ${filter} tasks.`}
              </p>
            ) : (
              <AnimatePresence>
                {filtered.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    className="flex items-center gap-3 px-6 py-3 border-b last:border-b-0 hover:bg-secondary/50 transition-colors duration-150"
                  >
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm transition-all duration-200 ${
                          task.status === "completed"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.subjects?.name} · {format(new Date(task.due_date), "MMM d")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
};

export default Tasks;
