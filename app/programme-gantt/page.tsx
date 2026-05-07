"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, useDraggable } from "@dnd-kit/core";
import { supabase } from "../../lib/supabase";

/* ---------------- TYPES ---------------- */

type Site = {
  id: string;
  site_name: string;
};

type Plot = {
  id: string;
  plot_number: string;
  plot_name: string | null;
};

type Trade = {
  id: string;
  trade_name: string;
  colour: string;
};

type TaskTemplate = {
  id: string;
  task_name: string;
};

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

/* ---------------- DATE HELPERS ---------------- */

function daysBetween(a: Date, b: Date) {
  return Math.round(
    (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
  );
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

    if (day !== 0 && day !== 6) {
      added++;
    }
  }

  return date.toISOString().split("T")[0];
}

function calculateEndDate(
  start: string,
  duration: number,
  excludeWeekends: boolean
) {
  if (duration <= 1) return start;

  return excludeWeekends
    ? addWorkingDays(start, duration - 1)
    : addCalendarDays(start, duration - 1);
}

function calculateNextStartDate(
  end: string,
  gap: number,
  excludeWeekends: boolean
) {
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

/* ---------------- TASK BAR ---------------- */

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
  onResizeStart: (
    task: Task,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  onDelete: (task: Task) => void;
  onSelect: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({
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
        transform: transform
          ? `translate3d(${transform.x}px, 0, 0)`
          : undefined
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

/* ---------------- PAGE ---------------- */

export default function ProgrammeGantt() {
  const [role, setRole] = useState("");
  const [userTrade, setUserTrade] = useState("");

  const [sites, setSites] = useState<Site[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [programmeTemplateItems, setProgrammeTemplateItems] =
    useState<ProgrammeTemplateItem[]>([]);
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

  const canEdit =
    role === "site_manager" ||
    role === "contracts_manager";

  /* ---------------- LOADERS ---------------- */

  async function loadRole() {
    const { data: userData } =
      await supabase.auth.getUser();

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
  }

  async function loadTrades(siteId: string) {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("site_id", siteId)
      .order("trade_name", { ascending: true });

    setTrades(data || []);
  }

  async function loadTaskTemplates(siteId: string) {
    const { data } = await supabase
      .from("task_templates")
      .select("*")
      .eq("site_id", siteId)
      .order("task_name", { ascending: true });

    setTaskTemplates(data || []);
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

  /* ---------------- APPLY TEMPLATE ---------------- */

  async function applyTemplateToPlot() {
    if (!canEdit) {
      setMessage("No permission.");
      return;
    }

    if (
      !selectedSite ||
      !templatePlotNumber ||
      !templateStartDate
    ) {
      setMessage("Select plot and start date.");
      return;
    }

    if (programmeTemplateItems.length === 0) {
      setMessage("No programme template items.");
      return;
    }

    const confirmed = window.confirm(
      `Apply template to Plot ${templatePlotNumber}?`
    );

    if (!confirmed) return;

    let currentStartDate = templateStartDate;

    const tasksToInsert = programmeTemplateItems
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

    const { error } = await supabase
      .from("programme_tasks")
      .insert(tasksToInsert);

    if (error) {
      setMessage("Template error: " + error.message);
      return;
    }

    setMessage("Template applied successfully");

    setTemplateStartDate("");

    loadTasks(selectedSite);
  }

  /* ---------------- UI ---------------- */

  useEffect(() => {
    loadRole();
    loadSites();
  }, []);

  const visibleTasks =
    role === "subcontractor" && userTrade
      ? tasks.filter(
          (task) => task.trade === userTrade
        )
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

    const starts = datedTasks.map(
      (task) => new Date(task.start_date as string)
    );

    const ends = datedTasks.map(
      (task) => new Date(task.end_date as string)
    );

    let start = new Date(
      Math.min(...starts.map((date) => date.getTime()))
    );

    let end = new Date(
      Math.max(...ends.map((date) => date.getTime()))
    );

    if (scale === "weekly") {
      start = startOfWeek(start);

      const endWeek = startOfWeek(end);

      endWeek.setDate(endWeek.getDate() + 6);

      end = endWeek;
    }

    return {
      start,
      end,
      days:
        Math.max(
          1,
          daysBetween(start, end) + 1
        )
    };
  }, [datedTasks, scale]);

  const dateColumns = useMemo(() => {
    const dates = [];

    if (scale === "weekly") {
      const weeks = Math.ceil(range.days / 7);

      for (let i = 0; i < weeks; i++) {
        const date = new Date(range.start);

        date.setDate(
          range.start.getDate() + i * 7
        );

        dates.push(date);
      }

      return dates;
    }

    for (let i = 0; i < range.days; i++) {
      const date = new Date(range.start);

      date.setDate(
        range.start.getDate() + i
      );

      dates.push(date);
    }

    return dates;
  }, [range, scale]);

  const columnCount =
    scale === "weekly"
      ? Math.ceil(range.days / 7)
      : range.days;

  const plotRows = useMemo(() => {
    const plotNumbers = new Set<string>();

    plots.forEach((plot) =>
      plotNumbers.add(plot.plot_number)
    );

    datedTasks.forEach((task) => {
      if (task.plot_number) {
        plotNumbers.add(task.plot_number);
      }
    });

    return Array.from(plotNumbers).sort(
      (a, b) =>
        a.localeCompare(b, undefined, {
          numeric: true
        })
    );
  }, [plots, datedTasks]);

  function tasksForPlot(plot: string) {
    return datedTasks.filter(
      (task) => task.plot_number === plot
    );
  }

  function getTradeColour(tradeName: string | null) {
    const found = trades.find(
      (item) => item.trade_name === tradeName
    );

    return found?.colour || "#1368b3";
  }

  /* ---------------- RENDER ---------------- */

  return (
    <main>
      <h1>Gantt Programme View</h1>

      <div className="status-box">
        Status: {message}
      </div>

      <div className="card no-print">
        <h2>Controls</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={selectedSite}
            onChange={(event) => {
              setSelectedSite(event.target.value);
              loadSiteData(event.target.value);
            }}
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>

          <select
            value={scale}
            onChange={(event) =>
              setScale(event.target.value as Scale)
            }
          >
            <option value="daily">Daily View</option>
            <option value="weekly">Weekly View</option>
          </select>

          <button
            type="button"
            onClick={() => window.print()}
          >
            Print Gantt
          </button>
        </div>
      </div>

      {canEdit && (
        <div className="card no-print">
          <h2>Apply Template To Plot</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              value={templatePlotNumber}
              onChange={(event) =>
                setTemplatePlotNumber(
                  event.target.value
                )
              }
            >
              <option value="">Select plot</option>

              {plots.map((plot) => (
                <option
                  key={plot.id}
                  value={plot.plot_number}
                >
                  Plot {plot.plot_number}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={templateStartDate}
              onChange={(event) =>
                setTemplateStartDate(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              onClick={applyTemplateToPlot}
            >
              Apply Template
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Programme Timeline</h2>

        <div className="gantt-wrap">
          <div className="gantt">
            <div className="gantt-header-row">
              <div className="gantt-label gantt-header-label">
                Plot
              </div>

              <div
                className="gantt-date-bar"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, minmax(${
                    scale === "weekly"
                      ? "120px"
                      : "70px"
                  }, 1fr))`
                }}
              >
                {dateColumns.map((date, index) => (
                  <div
                    key={index}
                    className="gantt-date-cell"
                  >
                    {scale === "weekly"
                      ? `W/C ${formatDate(date)}`
                      : formatDate(date)}
                  </div>
                ))}
              </div>
            </div>

            {plotRows.map((plot) => (
              <div className="gantt-row" key={plot}>
                <div className="gantt-label">
                  Plot {plot}
                </div>

                <div
                  className="gantt-track gantt-grid"
                  style={{
                    backgroundSize: `${
                      100 / columnCount
                    }% 100%`
                  }}
                >
                  {tasksForPlot(plot).map(
                    (task) => {
                      const start = new Date(
                        task.start_date as string
                      );

                      const end = new Date(
                        task.end_date as string
                      );

                      const offset =
                        (daysBetween(
                          range.start,
                          start
                        ) /
                          range.days) *
                        100;

                      const width = Math.max(
                        4,
                        ((daysBetween(start, end) +
                          1) /
                          range.days) *
                          100
                      );

                      return (
                        <DraggableTaskBar
                          key={task.id}
                          task={task}
                          left={offset}
                          width={width}
                          colour={getTradeColour(
                            task.trade
                          )}
                          canEdit={false}
                          onResizeStart={() => {}}
                          onDelete={() => {}}
                          onSelect={() => {}}
                        />
                      );
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
