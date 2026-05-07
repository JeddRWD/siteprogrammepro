"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, useDraggable } from "@dnd-kit/core";
import { supabase } from "../../lib/supabase";

type Site = { id: string; site_name: string };
type Plot = { id: string; plot_number: string; plot_name: string | null };
type Trade = { id: string; trade_name: string; colour: string };
type TaskTemplate = { id: string; task_name: string };

type ProgrammeTemplateItem = {
  id: string;
  sequence_order: number;
  task_name: string;
  trade: string | null;
  duration_working_days: number;
  gap_working_days: number;
  exclude_weekends: boolean;
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

type Scale = "daily" | "weekly";

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addCalendarDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function addWorkingDays(dateString: string, days: number) {
  const date = new Date(dateString);
  let added = 0;

  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }

  return date.toISOString().split("T")[0];
}

function calculateEndDate(start: string, duration: number, excludeWeekends: boolean) {
  if (duration <= 1) return start;
  return excludeWeekends
    ? addWorkingDays(start, duration - 1)
    : addCalendarDays(start, duration - 1);
}

function calculateNextStartDate(end: string, gap: number, excludeWeekends: boolean) {
  return excludeWeekends
    ? addWorkingDays(end, gap + 1)
    : addCalendarDays(end, gap + 1);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function startOfWeek(date: Date) {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
  newDate.setDate(diff);
  return newDate;
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
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [programmeTemplateItems, setProgrammeTemplateItems] = useState<ProgrammeTemplateItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedSite, setSelectedSite] = useState("");
  const [message, setMessage] = useState("");
  const [scale, setScale] = useState<Scale>("daily");

  const [plotNumber, setPlotNumber] = useState("");
  const [taskName, setTaskName] = useState("");
  const [trade, setTrade] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Planned");

  const [templatePlotNumber, setTemplatePlotNumber] = useState("");
  const [templateStartDate, setTemplateStartDate] = useState("");

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
      setMessage("Not logged in.");
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

    if (data && data.length > 0) {
      setSelectedSite(data[0].id);
      loadSiteData(data[0].id);
    }
  }

  async function loadSiteData(siteId: string) {
    await Promise.all([
      loadPlots(siteId),
      loadTrades(siteId),
      loadTaskTemplates(siteId),
      loadProgrammeTemplateItems(siteId),
      loadTasks(siteId)
    ]);
  }

  async function loadPlots(siteId: string) {
    const { data } = await supabase
      .from("plots")
      .select("*")
      .eq("site_id", siteId)
      .order("plot_number", { ascending: true });

    setPlots(data || []);

    if (data && data.length > 0) {
      setPlotNumber(data[0].plot_number);
      setTemplatePlotNumber(data[0].plot_number);
    }
  }

  async function loadTrades(siteId: string) {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("site_id", siteId)
      .order("trade_name", { ascending: true });

    setTrades(data || []);

    if (data && data.length > 0) {
      setTrade(data[0].trade_name);
    }
  }

  async function loadTaskTemplates(siteId: string) {
    const { data } = await supabase
      .from("task_templates")
      .select("*")
      .eq("site_id", siteId)
      .order("task_name", { ascending: true });

    setTaskTemplates(data || []);

    if (data && data.length > 0) {
      setTaskName(data[0].task_name);
    }
  }

  async function loadProgrammeTemplateItems(siteId: string) {
    const { data } = await supabase
      .from("programme_template_items")
      .select("*")
      .eq("site_id", siteId)
      .order("sequence_order", { ascending: true });

    setProgrammeTemplateItems(data || []);
  }

  async function loadTasks(siteId: string) {
    const { data } = await supabase
      .from("programme_tasks")
      .select("*")
      .eq("site_id", siteId)
      .order("plot_number", { ascending: true });

    setTasks(data || []);
  }

  function getTradeColour(tradeName: string | null) {
    const found = trades.find((item) => item.trade_name === tradeName);
    return found?.colour || "#1368b3";
  }

  async function addTask() {
    if (!canEdit) return setMessage("No permission.");

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

    setStartDate("");
    setEndDate("");
    setStatus("Planned");
    setMessage("Task added");
    loadTasks(selectedSite);
  }

  async function applyTemplateToPlot() {
    if (!canEdit) return setMessage("No permission.");

    if (!selectedSite || !templatePlotNumber || !templateStartDate) {
      setMessage("Select plot and start date.");
      return;
    }

    if (programmeTemplateItems.length === 0) {
      setMessage("No programme template items.");
      return;
    }

    const confirmed = window.confirm(`Apply template to Plot ${templatePlotNumber}?`);
    if (!confirmed) return;

    let currentStartDate = templateStartDate;

    const tasksToInsert = [...programmeTemplateItems]
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .map((item) => {
        const start = currentStartDate;

        const end = calculateEndDate(
          start,
          item.duration_working_days,
          item.exclude_weekends
        );

        currentStartDate = calculateNextStartDate(
          end,
          item.gap_working_days,
          item.exclude_weekends
        );

        return {
          site_id: selectedSite,
          plot_number: templatePlotNumber,
          task_name: item.task_name,
          trade: item.trade,
          start_date: start,
          end_date: end,
          status: "Planned"
        };
      });

    const { error } = await supabase.from("programme_tasks").insert(tasksToInsert);

    if (error) {
      setMessage("Template error: " + error.message);
      return;
    }

    setTemplateStartDate("");
    setMessage("Template applied successfully");
    loadTasks(selectedSite);
  }

  function selectTask(task: Task) {
    setSelectedTask(task);
    setEditPlotNumber(task.plot_number || "");
    setEditTaskName(task.task_name || "");
    setEditTrade(task.trade || "");
    setEditStartDate(task.start_date || "");
    setEditEndDate(task.end_date || "");
    setEditStatus(task.status || "Planned");
    setMessage(`Editing Plot ${task.plot_number} - ${task.task_name}`);
  }

  async function moveFollowingTasks(
    plot: string | null,
    fromDate: string,
    movedDays: number,
    excludingTaskId: string
  ) {
    if (!plot || movedDays === 0) return;

    const followingTasks = tasks.filter(
      (task) =>
        task.id !== excludingTaskId &&
        task.plot_number === plot &&
        task.start_date &&
        task.end_date &&
        new Date(task.start_date) > new Date(fromDate)
    );

    if (followingTasks.length === 0) return;

    const confirmed = window.confirm(
      `Move ${followingTasks.length} following task(s) on Plot ${plot} by ${movedDays} day(s) as well?`
    );

    if (!confirmed) return;

    await Promise.all(
      followingTasks.map((task) =>
        supabase
          .from("programme_tasks")
          .update({
            start_date: addCalendarDays(task.start_date as string, movedDays),
            end_date: addCalendarDays(task.end_date as string, movedDays)
          })
          .eq("id", task.id)
      )
    );
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

    const movedDays =
      selectedTask.start_date && editStartDate
        ? daysBetween(new Date(selectedTask.start_date), new Date(editStartDate))
        : 0;

    const oldStartDate = selectedTask.start_date || editStartDate;

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

    if (movedDays !== 0) {
      await moveFollowingTasks(
        selectedTask.plot_number,
        oldStartDate,
        movedDays,
        selectedTask.id
      );
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
    setMessage("Task deleted");
    loadTasks(selectedSite);
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

    let start = new Date(Math.min(...starts.map((date) => date.getTime())));
    let end = new Date(Math.max(...ends.map((date) => date.getTime())));

    if (scale === "weekly") {
      start = startOfWeek(start);
      const endWeek = startOfWeek(end);
      endWeek.setDate(endWeek.getDate() + 6);
      end = endWeek;
    }

    return { start, end, days: Math.max(1, daysBetween(start, end) + 1) };
  }, [datedTasks, scale]);

  const dateColumns = useMemo(() => {
    const dates = [];

    if (scale === "weekly") {
      const weeks = Math.ceil(range.days / 7);

      for (let i = 0; i < weeks; i++) {
        const date = new Date(range.start);
        date.setDate(range.start.getDate() + i * 7);
        dates.push(date);
      }

      return dates;
    }

    for (let i = 0; i < range.days; i++) {
      const date = new Date(range.start);
      date.setDate(range.start.getDate() + i);
      dates.push(date);
    }

    return dates;
  }, [range, scale]);

  const columnCount = scale === "weekly" ? Math.ceil(range.days / 7) : range.days;

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

    const ganttWidth = document
      .querySelector(".gantt-track")
      ?.getBoundingClientRect().width;

    if (!ganttWidth) return;

    const pixelsPerDay = ganttWidth / range.days;
    const movedDays = Math.round(event.delta.x / pixelsPerDay);

    if (movedDays === 0) return;

    const newStartDate = addCalendarDays(task.start_date, movedDays);
    const newEndDate = addCalendarDays(task.end_date, movedDays);

    const oldStartDate = task.start_date;

    const { error } = await supabase
      .from("programme_tasks")
      .update({
        start_date: newStartDate,
        end_date: newEndDate
      })
      .eq("id", task.id);

    if (error) {
      setMessage("Move error: " + error.message);
      return;
    }

    await moveFollowingTasks(task.plot_number, oldStartDate, movedDays, task.id);

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

    const ganttWidth = document
      .querySelector(".gantt-track")
      ?.getBoundingClientRect().width;

    if (!ganttWidth) return;

    const pixelsPerDay = ganttWidth / range.days;

    function onPointerMove(moveEvent: PointerEvent) {
      const changedDays = Math.round((moveEvent.clientX - startX) / pixelsPerDay);
      const proposedEndDate = addCalendarDays(originalEndDate, changedDays);

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

      const finalEndDate = addCalendarDays(originalEndDate, changedDays);

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
        <h2>Controls</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={selectedSite} onChange={(event) => handleSiteChange(event.target.value)}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>

          <select value={scale} onChange={(event) => setScale(event.target.value as Scale)}>
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly View</option>
          </select>

          <a href="/site-admin">
            <button type="button">Site Admin</button>
          </a>

          <button type="button" onClick={() => window.print()}>
            Print Gantt
          </button>
        </div>
      </div>

      {canEdit && (
        <div className="card no-print">
          <h2>Add Individual Task</h2>

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

            <select value={taskName} onChange={(event) => setTaskName(event.target.value)}>
              <option value="">Select task</option>
              {taskTemplates.map((task) => (
                <option key={task.id} value={task.task_name}>
                  {task.task_name}
                </option>
              ))}
            </select>

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

      {canEdit && (
        <div className="card no-print">
          <h2>Apply Template To Plot</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select value={templatePlotNumber} onChange={(event) => setTemplatePlotNumber(event.target.value)}>
              <option value="">Select plot</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.plot_number}>
                  Plot {plot.plot_number}
                  {plot.plot_name ? ` - ${plot.plot_name}` : ""}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={templateStartDate}
              onChange={(event) => setTemplateStartDate(event.target.value)}
            />

            <button type="button" onClick={applyTemplateToPlot}>
              Apply Template
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

            <select value={editTaskName} onChange={(event) => setEditTaskName(event.target.value)}>
              {taskTemplates.map((task) => (
                <option key={task.id} value={task.task_name}>
                  {task.task_name}
                </option>
              ))}
            </select>

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

            <button type="button" onClick={saveTaskChanges}>
              Save Changes
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSelectedTask(null);
                setMessage("Edit cancelled");
              }}
            >
              Cancel
            </button>

            <button type="button" className="danger-button" onClick={() => deleteTask(selectedTask)}>
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="card gantt-print-card">
        <h2>Programme Timeline</h2>

        <DndContext onDragEnd={handleDragEnd}>
          <div className="gantt-wrap">
            <div className={scale === "weekly" ? "gantt gantt-weekly" : "gantt"}>
              <div className="gantt-header-row">
                <div className="gantt-label gantt-header-label">Plot</div>

                <div
                  className="gantt-date-bar"
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(${
                      scale === "weekly" ? "120px" : "70px"
                    }, 1fr))`
                  }}
                >
                  {dateColumns.map((date, index) => (
                    <div key={index} className="gantt-date-cell">
                      {scale === "weekly" ? `W/C ${formatDate(date)}` : formatDate(date)}
                    </div>
                  ))}
                </div>
              </div>

              {plotRows.map((plot) => (
                <div className="gantt-row" key={plot}>
                  <div className="gantt-label">Plot {plot}</div>

                  <div
                    className="gantt-track gantt-grid"
                    style={{ backgroundSize: `${100 / columnCount}% 100%` }}
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
