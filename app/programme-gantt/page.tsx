"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  useDraggable
} from "@dnd-kit/core";
import { supabase } from "../../lib/supabase";

type Site = {
  id: string;
  site_name: string;
};

type Task = {
  id: string;
  plot_number: string | null;
  task_name: string | null;
  trade: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function getBarColour(status: string | null) {
  switch (status) {
    case "Complete":
      return "#17803d";
    case "In Progress":
      return "#d99904";
    case "Delayed":
      return "#b31313";
    case "At Risk":
      return "#e56b00";
    default:
      return "#1368b3";
  }
}

function DraggableTaskBar({
  task,
  left,
  width,
  canDrag
}: {
  task: Task;
  left: number;
  width: number;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: !canDrag
  });

  return (
    <div
      ref={setNodeRef}
      className="gantt-bar"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        background: getBarColour(task.status),
        cursor: canDrag ? "grab" : "default",
        transform: transform
          ? `translate3d(${transform.x}px, 0, 0)`
          : undefined
      }}
      {...listeners}
      {...attributes}
    >
      {task.trade} - {task.task_name}
    </div>
  );
}

export default function ProgrammeGantt() {
  const [role, setRole] = useState("");
  const [userTrade, setUserTrade] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [message, setMessage] = useState("");

  const [plotNumber, setPlotNumber] = useState("");
  const [taskName, setTaskName] = useState("");
  const [trade, setTrade] = useState("Electrical");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Planned");

  const canDrag = role === "site_manager" || role === "contracts_manager";

  async function loadRole() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) return;

    const { data } = await supabase
      .from("profiles")
      .select("role, trade")
      .eq("id", userData.user.id)
      .single();

    setRole(data?.role || "");
    setUserTrade(data?.trade || "");
  }

  async function loadSites() {
    const { data } = await supabase
      .from("sites")
      .select("id, site_name")
      .order("created_at", { ascending: false });

    setSites(data || []);

    if (data && data.length > 0) {
      setSelectedSite(data[0].id);
      loadTasks(data[0].id);
    }
  }

  async function loadTasks(siteId: string) {
    const { data } = await supabase
      .from("programme_tasks")
      .select("*")
      .eq("site_id", siteId);

    setTasks(data || []);
  }

  async function addTask() {
    if (!canDrag) {
      setMessage("No permission");
      return;
    }

    if (!plotNumber || !taskName || !startDate || !endDate) {
      setMessage("Fill all fields");
      return;
    }

    const { error } = await supabase.from("programme_tasks").insert({
      site_id: selectedSite,
      plot_number: plotNumber,
      task_name: taskName,
      trade,
      start_date: startDate,
      end_date: endDate,
      status
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Task added");
    setPlotNumber("");
    setTaskName("");
    setStartDate("");
    setEndDate("");
    loadTasks(selectedSite);
  }

  useEffect(() => {
    loadRole();
    loadSites();
  }, []);

  const datedTasks = tasks.filter((t) => t.start_date && t.end_date);

  const range = useMemo(() => {
    if (!datedTasks.length) return { start: new Date(), end: new Date(), days: 1 };

    const start = new Date(
      Math.min(...datedTasks.map((t) => new Date(t.start_date!).getTime()))
    );

    const end = new Date(
      Math.max(...datedTasks.map((t) => new Date(t.end_date!).getTime()))
    );

    return {
      start,
      end,
      days: daysBetween(start, end) + 1
    };
  }, [datedTasks]);

  const tasksByPlot = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    datedTasks.forEach((t) => {
      const plot = t.plot_number || "No Plot";
      if (!grouped[plot]) grouped[plot] = [];
      grouped[plot].push(t);
    });

    return Object.entries(grouped);
  }, [datedTasks]);

  async function handleDragEnd(event: DragEndEvent) {
    if (!canDrag) return;

    const task = tasks.find((t) => t.id === event.active.id);
    if (!task || !task.start_date || !task.end_date) return;

    const width = document.querySelector(".gantt-track")?.clientWidth || 1;
    const movedDays = Math.round((event.delta.x / width) * range.days);

    if (movedDays === 0) return;

    const newStart = addDays(task.start_date, movedDays);
    const newEnd = addDays(task.end_date, movedDays);

    await supabase
      .from("programme_tasks")
      .update({ start_date: newStart, end_date: newEnd })
      .eq("id", task.id);

    loadTasks(selectedSite);
  }

  return (
    <main>
      <h1>Gantt Programme</h1>

      <div className="status-box">
        {message} | Role: {role}
      </div>

      <div className="card">
        <select
          value={selectedSite}
          onChange={(e) => {
            setSelectedSite(e.target.value);
            loadTasks(e.target.value);
          }}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.site_name}
            </option>
          ))}
        </select>
      </div>

      {canDrag && (
        <div className="card">
          <h2>Add Task</h2>

          <input placeholder="Plot" value={plotNumber} onChange={(e) => setPlotNumber(e.target.value)} />
          <input placeholder="Task" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

          <button onClick={addTask}>Add</button>
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        {tasksByPlot.map(([plot, plotTasks]) => (
          <div key={plot} className="gantt-row">
            <div className="gantt-label">Plot {plot}</div>
            <div className="gantt-track">
              {plotTasks.map((task) => {
                const start = new Date(task.start_date!);
                const end = new Date(task.end_date!);

                const offset =
                  (daysBetween(range.start, start) / range.days) * 100;

                const width =
                  ((daysBetween(start, end) + 1) / range.days) * 100;

                return (
                  <DraggableTaskBar
                    key={task.id}
                    task={task}
                    left={offset}
                    width={width}
                    canDrag={canDrag}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </DndContext>
    </main>
  );
}
