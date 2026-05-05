"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, useDraggable } from "@dnd-kit/core";
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
  canEdit,
  onResizeStart,
  onDelete
}: {
  task: Task;
  left: number;
  width: number;
  canEdit: boolean;
  onResizeStart: (
    task: Task,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  onDelete: (task: Task) => void;
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
        background: getBarColour(task.status),
        cursor: canEdit ? "grab" : "default",
        transform: transform
          ? `translate3d(${transform.x}px, 0, 0)`
          : undefined
      }}
      title={`${task.trade} - ${task.task_name}`}
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
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task);
            }}
            title="Delete task"
          >
            ×
          </button>

          <div
            className="gantt-resize-handle"
            onPointerDown={(event) => {
              event.stopPropagation();
              onResizeStart(task, event);
            }}
            title="Resize duration"
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [message, setMessage] = useState("");

  const [plotNumber, setPlotNumber] = useState("");
  const [taskName, setTaskName] = useState("");
  const [trade, setTrade] = useState("Electrical");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Planned");

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
      loadTasks(data[0].id);
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

  async function addTask() {
    if (!canEdit) {
      setMessage("You do not have permission to add tasks.");
      return;
    }

    if (!selectedSite) {
      setMessage("Please select a site.");
      return;
    }

    if (!plotNumber || !taskName || !startDate || !endDate) {
      setMessage("Enter plot, task, start date and end date.");
      return;
    }

    setMessage("Adding task...");

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

    setPlotNumber("");
    setTaskName("");
    setTrade("Electrical");
    setStartDate("");
    setEndDate("");
    setStatus("Planned");

    setMessage("Task added");
    loadTasks(selectedSite);
  }

  async function deleteTask(task: Task) {
    if (!canEdit) {
      setMessage("You do not have permission to delete tasks.");
      return;
    }

    const confirmed = window.confirm(
      `Delete task "${task.task_name}" from Plot ${task.plot_number}?`
    );

    if (!confirmed) return;

    setMessage("Deleting task...");

    const { error } = await supabase
      .from("programme_tasks")
      .delete()
      .eq("id", task.id);

    if (error) {
      setMessage("Delete error: " + error.message);
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== task.id));
    setMessage("Task deleted");
  }

  function handleSiteChange(siteId: string) {
    setSelectedSite(siteId);
    loadTasks(siteId);
  }

  useEffect(() => {
    loadRole();
    loadSites();
  }, []);

  const visibleTasks =
    role === "subcontractor" && userTrade
      ? tasks.filter((task) => task.trade === userTrade)
      : tasks;

  const datedTasks = visibleTasks.filter(
    (task) => task.start_date && task.end_date
  );

  const range = useMemo(() => {
    if (datedTasks.length === 0) {
      return {
        start: new Date(),
        end: new Date(),
        days: 1
      };
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

  const tasksByPlot = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    datedTasks.forEach((task) => {
      const plot = task.plot_number || "No Plot";

      if (!grouped[plot]) {
        grouped[plot] = [];
      }

      grouped[plot].push(task);
    });

    return Object.entries(grouped).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [datedTasks]);

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

    const newStartDate = addDays(task.start_date, movedDays);
    const newEndDate = addDays(task.end_date, movedDays);

    setMessage(`Moving task by ${movedDays} day(s)...`);

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

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              start_date: newStartDate,
              end_date: newEndDate
            }
          : item
      )
    );

    setMessage("Task moved and saved");
  }

  function handleResizeStart(
    task: Task,
    pointerDownEvent: React.PointerEvent<HTMLDivElement>
  ) {
    if (!canEdit || !task.start_date || !task.end_date) return;

    pointerDownEvent.preventDefault();

    const startX = pointerDownEvent.clientX;
    const originalEndDate = task.end_date;

    const ganttWidth = document
      .querySelector(".gantt-track")
      ?.getBoundingClientRect().width;

    if (!ganttWidth) return;

    const pixelsPerDay = ganttWidth / range.days;

    function onPointerMove(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - startX;
      const changedDays = Math.round(deltaX / pixelsPerDay);

      const proposedEndDate = addDays(originalEndDate, changedDays);

      if (new Date(proposedEndDate) < new Date(task.start_date as string)) {
        return;
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                end_date: proposedEndDate
              }
            : item
        )
      );
    }

    async function onPointerUp(upEvent: PointerEvent) {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);

      const deltaX = upEvent.clientX - startX;
      const changedDays = Math.round(deltaX / pixelsPerDay);

      if (changedDays === 0) {
        setMessage("Resize cancelled");
        return;
      }

      const finalEndDate = addDays(originalEndDate, changedDays);

      if (new Date(finalEndDate) < new Date(task.start_date as string)) {
        setMessage("End date cannot be before start date");
        loadTasks(selectedSite);
        return;
      }

      setMessage(`Updating duration by ${changedDays} day(s)...`);

      const { error } = await supabase
        .from("programme_tasks")
        .update({
          end_date: finalEndDate
        })
        .eq("id", task.id);

      if (error) {
        setMessage("Resize error: " + error.message);
        loadTasks(selectedSite);
        return;
      }

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
        {role === "subcontractor"
          ? ` | Trade: ${userTrade || "Not set"}`
          : ""}
        <br />
        Editing Enabled: {canEdit ? "Yes" : "No"}
      </div>

      <div className="card no-print">
        <h2>Select Site</h2>

        <select
          value={selectedSite}
          onChange={(event) => handleSiteChange(event.target.value)}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.site_name}
            </option>
          ))}
        </select>
      </div>

      {canEdit && (
        <div className="card no-print">
          <h2>Add Task</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              placeholder="Plot"
              value={plotNumber}
              onChange={(event) => setPlotNumber(event.target.value)}
            />

            <input
              placeholder="Task"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
            />

            <select
              value={trade}
              onChange={(event) => setTrade(event.target.value)}
            >
              <option>Electrical</option>
              <option>Plumbing</option>
              <option>Drylining</option>
              <option>Joinery</option>
              <option>Brickwork</option>
              <option>Roofing</option>
              <option>Decorating</option>
              <option>Groundworks</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
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

      <div className="card">
        <h2>Programme Timeline</h2>

        <p>
          {range.start.toLocaleDateString("en-GB")} →{" "}
          {range.end.toLocaleDateString("en-GB")}
        </p>

        {canEdit ? (
          <p>
            Drag bars left/right to move tasks. Drag the right edge to change
            duration. Click × to delete.
          </p>
        ) : (
          <p>
            View only. Subcontractors can suggest changes but cannot edit the
            programme directly.
          </p>
        )}

        {datedTasks.length === 0 && <p>No dated tasks to show.</p>}

        <DndContext onDragEnd={handleDragEnd}>
          <div className="gantt-wrap">
            <div className="gantt">
              <div className="gantt-header-row">
                <div className="gantt-label gantt-header-label">Plot</div>

                <div
                  className="gantt-date-bar"
                  style={{
                    gridTemplateColumns: `repeat(${range.days}, minmax(70px, 1fr))`
                  }}
                >
                  {dateColumns.map((date, index) => (
                    <div key={index} className="gantt-date-cell">
                      {formatDate(date)}
                    </div>
                  ))}
                </div>
              </div>

              {tasksByPlot.map(([plot, plotTasks]) => (
                <div className="gantt-row" key={plot}>
                  <div className="gantt-label">Plot {plot}</div>

                  <div
                    className="gantt-track gantt-grid"
                    style={{
                      backgroundSize: `${100 / range.days}% 100%`
                    }}
                  >
                    {plotTasks.map((task) => {
                      const start = new Date(task.start_date as string);
                      const end = new Date(task.end_date as string);

                      const offset =
                        (daysBetween(range.start, start) / range.days) * 100;

                      const width = Math.max(
                        4,
                        ((daysBetween(start, end) + 1) / range.days) * 100
                      );

                      return (
                        <DraggableTaskBar
                          key={task.id}
                          task={task}
                          left={offset}
                          width={width}
                          canEdit={canEdit}
                          onResizeStart={handleResizeStart}
                          onDelete={deleteTask}
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
