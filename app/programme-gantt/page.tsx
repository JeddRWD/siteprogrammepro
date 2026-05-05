"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, useDraggable } from "@dnd-kit/core";
import { supabase } from "../../lib/supabase";

type Site = { id: string; site_name: string };
type Plot = { id: string; plot_number: string; plot_name: string | null };
type Trade = { id: string; trade_name: string; colour: string };

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
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function DraggableTaskBar({
  task,
  left,
  width,
  colour,
  canEdit,
  onResizeStart,
  onDelete,
  onSelect
}: {
  task: Task;
  left: number;
  width: number;
  colour: string;
  canEdit: boolean;
  onResizeStart: (task: Task, event: React.PointerEvent<HTMLDivElement>) => void;
  onDelete: (task: Task) => void;
  onSelect: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: !canEdit
  });

  return (
    <div
      ref={setNodeRef}
      className="gantt-bar"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        background: colour,
        cursor: canEdit ? "grab" : "pointer",
        transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined
      }}
      onDoubleClickCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(task);
      }}
      {...listeners}
      {...attributes}
    >
      <span className="gantt-bar-text">
        {task.trade} - {task.task_name}
      </span>

      {canEdit && (
        <>
          <button
            type="button"
            className="gantt-delete-button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(task);
            }}
          >
            ×
          </button>

          <div
            className="gantt-resize-handle"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onResizeStart(task, event);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function ProgrammeGantt() {
  const [role, setRole] = useState("");
  const [userTrade, setUserTrade] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [message, setMessage] = useState("");

  const [plotNumber, setPlotNumber] = useState("");
  const [taskName, setTaskName] = useState("");
  const [trade, setTrade] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Planned");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editPlotNumber, setEditPlotNumber] = useState("");
  const [editTaskName, setEditTaskName] = useState("");
  const [editTrade, setEditTrade] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState("Planned");

  const canEdit = role === "site_manager" || role === "contracts_manager";

  async function loadRole() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      setMessage("Not logged in. Please login first.");
      return;
    }

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

    if (data && data.length > 0 && !selectedSite) {
      setSelectedSite(data[0].id);
      loadSiteData(data[0].id);
    }
  }

  async function loadSiteData(siteId: string) {
    await Promise.all([loadPlots(siteId), loadTrades(siteId), loadTasks(siteId)]);
  }

  async function loadPlots(siteId: string) {
    const { data } = await supabase
      .from("plots")
      .select("id, plot_number, plot_name")
      .eq("site_id", siteId)
      .order("plot_number", { ascending: true });

    setPlots(data || []);

    if (data && data.length > 0) {
      setPlotNumber(data[0].plot_number);
    }
  }

  async function loadTrades(siteId: string) {
    const { data } = await supabase
      .from("trades")
      .select("id, trade_name, colour")
      .eq("site_id", siteId)
      .order("trade_name", { ascending: true });

    setTrades(data || []);

    if (data && data.length > 0) {
      setTrade(data[0].trade_name);
      setEditTrade(data[0].trade_name);
    }
  }

  async function loadTasks(siteId: string) {
    setMessage("Loading Gantt view...");

    const { data, error } = await supabase
      .from("programme_tasks")
      .select("*")
      .eq("site_id", siteId)
      .order("plot_number", { ascending: true });

    if (error) {
      setMessage("Load error: " + error.message);
      return;
    }

    setTasks(data || []);
    setMessage("Gantt view loaded");
  }

  function getTradeColour(tradeName: string | null) {
    const found = trades.find((item) => item.trade_name === tradeName);
    return found?.colour || "#1368b3";
  }

  async function addTask() {
    if (!canEdit) {
      setMessage("You do not have permission to add tasks.");
      return;
    }

    if (!selectedSite || !plotNumber || !taskName || !trade || !startDate || !endDate) {
      setMessage("Enter plot, task, trade, start date and end date.");
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
      setMessage("Add task error: " + error.message);
      return;
    }

    setTaskName("");
    setStartDate("");
    setEndDate("");
    setStatus("Planned");
    setMessage("Task added");
    loadTasks(selectedSite);
  }

  function selectTask(task: Task) {
    setSelectedTask(task);
    setEditPlotNumber(task.plot_number || "");
    setEditTaskName(task.task_name || "");
    setEditTrade(task.trade || trades[0]?.trade_name || "");
    setEditStartDate(task.start_date || "");
    setEditEndDate(task.end_date || "");
    setEditStatus(task.status || "Planned");
    setMessage(`Editing Plot ${task.plot_number} - ${task.task_name}`);
  }

  async function saveTaskChanges() {
    if (!selectedTask || !canEdit) return;

    if (!editPlotNumber || !editTaskName || !editTrade || !editStartDate || !editEndDate) {
      setMessage("Enter plot, task, trade, start date and end date.");
      return;
    }

    if (new Date(editEndDate) < new Date(editStartDate)) {
      setMessage("End date cannot be before start date.");
      return;
    }

    const { error } = await supabase
      .from("programme_tasks")
      .update({
        plot_number: editPlotNumber,
        task_name: editTaskName,
        trade: editTrade,
        start_date: editStartDate,
        end_date: editEndDate,
        status: editStatus
      })
      .eq("id", selectedTask.id);

    if (error) {
      setMessage("Save error: " + error.message);
      return;
    }

    setSelectedTask(null);
    setMessage("Task updated");
    loadTasks(selectedSite);
  }

  async function deleteTask(task: Task) {
    if (!canEdit) return;

    const confirmed = window.confirm(
      `Delete task "${task.task_name}" from Plot ${task.plot_number}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("programme_tasks")
      .delete()
      .eq("id", task.id);

    if (error) {
      setMessage("Delete error: " + error.message);
      return;
    }

    setSelectedTask(null);
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setMessage("Task deleted");
  }

  function handleSiteChange(siteId: string) {
    setSelectedSite(siteId);
    setSelectedTask(null);
    loadSiteData(siteId);
  }

  useEffect(() => {
    loadRole();
    loadSites();
  }, []);

  const visibleTasks =
    role === "subcontractor" && userTrade
      ? tasks.filter((task) => task.trade === userTrade)
      : tasks;

  const datedTasks = visibleTasks.filter((task) => task.start_date && task.end_date);

  const range = useMemo(() => {
    if (datedTasks.length === 0) {
      return { start: new Date(), end: new Date(), days: 1 };
    }

    const starts = datedTasks.map((task) => new Date(task.start_date as string));
    const ends = datedTasks.map((task) => new Date(task.end_date as string));

    const start = new Date(Math.min(...starts.map((date) => date.getTime())));
    const end = new Date(Math.max(...ends.map((date) => date.getTime())));

    return {
      start,
      end,
      days: Math.max(1, daysBetween(start, end) + 1)
    };
  }, [datedTasks]);

  const dateColumns = useMemo(() => {
    const dates = [];

    for (let i = 0; i < range.days; i++) {
      const date = new Date(range.start);
      date.setDate(range.start.getDate() + i);
      dates.push(date);
    }

    return dates;
  }, [range]);

  const plotRows = useMemo(() => {
    const plotNumbers = new Set<string>();

    plots.forEach((plot) => plotNumbers.add(plot.plot_number));
    datedTasks.forEach((task) => {
      if (task.plot_number) plotNumbers.add(task.plot_number);
    });

    return Array.from(plotNumbers).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [plots, datedTasks]);

  function tasksForPlot(plot: string) {
    return datedTasks.filter((task) => task.plot_number === plot);
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!canEdit) return;

    const taskId = String(event.active.id);
    const task = tasks.find((item) => item.id === taskId);

    if (!task || !task.start_date || !task.end_date) return;

    const ganttWidth = document.querySelector(".gantt-track")?.getBoundingClientRect().width;
    if (!ganttWidth) return;

    const pixelsPerDay = ganttWidth / range.days;
    const movedDays = Math.round(event.delta.x / pixelsPerDay);

    if (movedDays === 0) return;

    const newStartDate = addDays(task.start_date, movedDays);
    const newEndDate = addDays(task.end_date, movedDays);

    const { error } = await supabase
      .from("programme_tasks")
      .update({ start_date: newStartDate, end_date: newEndDate })
      .eq("id", task.id);

    if (error) {
      setMessage("Move error: " + error.message);
      return;
    }

    setSelectedTask(null);
    setMessage("Task moved and saved");
    loadTasks(selectedSite);
  }

  function handleResizeStart(task: Task, event: React.PointerEvent<HTMLDivElement>) {
    if (!canEdit || !task.start_date || !task.end_date) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const originalEndDate = task.end_date;
    const ganttWidth = document.querySelector(".gantt-track")?.getBoundingClientRect().width;

    if (!ganttWidth) return;

    const pixelsPerDay = ganttWidth / range.days;

    function onPointerMove(moveEvent: PointerEvent) {
      const changedDays = Math.round((moveEvent.clientX - startX) / pixelsPerDay);
      const proposedEndDate = addDays(originalEndDate, changedDays);

      if (new Date(proposedEndDate) < new Date(task.start_date as string)) return;

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, end_date: proposedEndDate } : item
        )
      );
    }

    async function onPointerUp(upEvent: PointerEvent) {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);

      const changedDays = Math.round((upEvent.clientX - startX) / pixelsPerDay);

      if (changedDays === 0) return;

      const finalEndDate = addDays(originalEndDate, changedDays);

      if (new Date(finalEndDate) < new Date(task.start_date as string)) {
        setMessage("End date cannot be before start date");
        loadTasks(selectedSite);
        return;
      }

      const { error } = await supabase
        .from("programme_tasks")
        .update({ end_date: finalEndDate })
        .eq("id", task.id);

      if (error) {
        setMessage("Resize error: " + error.message);
        loadTasks(selectedSite);
        return;
      }

      setSelectedTask(null);
      setMessage("Task duration updated");
      loadTasks(selectedSite);
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  return (
    <main>
      <h1>Gantt Programme View</h1>

      <div className="status-box">
        Status: {message}
        <br />
        Role: {role || "Loading..."}
        {role === "subcontractor" ? ` | Trade: ${userTrade || "Not set"}` : ""}
        <br />
        Editing Enabled: {canEdit ? "Yes" : "No"}
      </div>

      <div className="card no-print">
        <h2>Select Site</h2>
        <select value={selectedSite} onChange={(event) => handleSiteChange(event.target.value)}>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.site_name}
            </option>
          ))}
        </select>

        <a href="/site-admin" style={{ marginLeft: 12 }}>
          <button type="button">Site Admin</button>
        </a>
      </div>

      {canEdit && (
        <div className="card no-print">
          <h2>Add Task</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select value={plotNumber} onChange={(event) => setPlotNumber(event.target.value)}>
              <option value="">Select plot</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.plot_number}>
                  Plot {plot.plot_number}
                  {plot.plot_name ? ` - ${plot.plot_name}` : ""}
                </option>
              ))}
            </select>

            <input
              placeholder="Task"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
            />

            <select value={trade} onChange={(event) => setTrade(event.target.value)}>
              <option value="">Select trade</option>
              {trades.map((item) => (
                <option key={item.id} value={item.trade_name}>
                  {item.trade_name}
                </option>
              ))}
            </select>

            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />

            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>Planned</option>
              <option>In Progress</option>
              <option>Complete</option>
              <option>At Risk</option>
              <option>Delayed</option>
            </select>

            <button type="button" onClick={addTask}>
              Add Task
            </button>
          </div>
        </div>
      )}

      {selectedTask && canEdit && (
        <div className="card no-print">
          <h2>Edit Task</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select value={editPlotNumber} onChange={(event) => setEditPlotNumber(event.target.value)}>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.plot_number}>
                  Plot {plot.plot_number}
                  {plot.plot_name ? ` - ${plot.plot_name}` : ""}
                </option>
              ))}
            </select>

            <input value={editTaskName} onChange={(event) => setEditTaskName(event.target.value)} />

            <select value={editTrade} onChange={(event) => setEditTrade(event.target.value)}>
              {trades.map((item) => (
                <option key={item.id} value={item.trade_name}>
                  {item.trade_name}
                </option>
              ))}
            </select>

            <input type="date" value={editStartDate} onChange={(event) => setEditStartDate(event.target.value)} />
            <input type="date" value={editEndDate} onChange={(event) => setEditEndDate(event.target.value)} />

            <select value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
              <option>Planned</option>
              <option>In Progress</option>
              <option>Complete</option>
              <option>At Risk</option>
              <option>Delayed</option>
            </select>

            <button type="button" onClick={saveTaskChanges}>Save Changes</button>
            <button type="button" className="secondary-button" onClick={() => setSelectedTask(null)}>Cancel</button>
            <button type="button" className="danger-button" onClick={() => deleteTask(selectedTask)}>Delete</button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Programme Timeline</h2>

        {plotRows.length === 0 && (
          <p>No plots added yet. Go to Site Admin to add plots.</p>
        )}

        <DndContext onDragEnd={handleDragEnd}>
          <div className="gantt-wrap">
            <div className="gantt">
              <div className="gantt-header-row">
                <div className="gantt-label gantt-header-label">Plot</div>

                <div
                  className="gantt-date-bar"
                  style={{ gridTemplateColumns: `repeat(${range.days}, minmax(70px, 1fr))` }}
                >
                  {dateColumns.map((date, index) => (
                    <div key={index} className="gantt-date-cell">
                      {formatDate(date)}
                    </div>
                  ))}
                </div>
              </div>

              {plotRows.map((plot) => (
                <div className="gantt-row" key={plot}>
                  <div className="gantt-label">Plot {plot}</div>

                  <div
                    className="gantt-track gantt-grid"
                    style={{ backgroundSize: `${100 / range.days}% 100%` }}
                  >
                    {tasksForPlot(plot).map((task) => {
                      const start = new Date(task.start_date as string);
                      const end = new Date(task.end_date as string);

                      const offset = (daysBetween(range.start, start) / range.days) * 100;
                      const width = Math.max(4, ((daysBetween(start, end) + 1) / range.days) * 100);

                      return (
                        <DraggableTaskBar
                          key={task.id}
                          task={task}
                          left={offset}
                          width={width}
                          colour={getTradeColour(task.trade)}
                          canEdit={canEdit}
                          onResizeStart={handleResizeStart}
                          onDelete={deleteTask}
                          onSelect={selectTask}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DndContext>
      </div>
    </main>
  );
}
