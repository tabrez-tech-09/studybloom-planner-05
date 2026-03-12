import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, BookOpen, CalendarDays } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } },
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [exams, setExams] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: tasks } = await supabase.from("tasks").select("*").eq("user_id", user.id);
      const t = tasks || [];
      const completed = t.filter((t) => t.status === "completed").length;
      setStats({ total: t.length, completed, pending: t.length - completed });
      setRecentTasks(t.slice(-5).reverse());

      const { data: examData } = await supabase
        .from("exams")
        .select("*, subjects(name)")
        .eq("user_id", user.id)
        .gte("exam_date", new Date().toISOString().split("T")[0])
        .order("exam_date", { ascending: true })
        .limit(5);
      setExams(examData || []);
    };
    load();
  }, [user]);

  const chartData = [
    { name: "Completed", value: stats.completed },
    { name: "Pending", value: stats.pending },
  ];
  const COLORS = ["hsl(262, 80%, 58%)", "hsl(240, 4.8%, 95.9%)"];

  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.h1 variants={item} className="text-3xl font-semibold tracking-tight">
          Dashboard
        </motion.h1>

        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Tasks", value: stats.total, icon: CheckSquare },
            { label: "Completed", value: stats.completed, icon: BookOpen },
            { label: "Pending", value: stats.pending, icon: Clock },
          ].map((s) => (
            <Card key={s.label} className="shadow-card hover:shadow-card-hover transition-shadow duration-200">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={item}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Study Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.total === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    No tasks yet. Add an exam in the planner to get started.
                  </p>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Upcoming Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exams.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No upcoming exams scheduled.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {exams.map((exam) => (
                      <li
                        key={exam.id}
                        className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors duration-150"
                      >
                        <span className="font-medium text-sm">{exam.subjects?.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {format(new Date(exam.exam_date), "MMM d")} · in{" "}
                          {differenceInDays(new Date(exam.exam_date), new Date())} days
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={item}>
          <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  All clear. Add an exam in the planner to generate your study tasks.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary transition-colors duration-150"
                    >
                      <span
                        className={`text-sm ${
                          task.status === "completed"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(task.due_date), "MMM d")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;
