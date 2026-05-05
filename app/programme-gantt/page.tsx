"use client";

import { useEffect, useMemo, useState } from "react";
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
  return Math.max(
    0,
    Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

export default function ProgrammeGantt() {
  const [role, setRole] = useState("");
  const [userTrade, setUserTrade] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [message, setMessage] = useState("");

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
      setMessage("Error: " + error.message);
      return;
    }

    setTasks(data || []);
    setMessage("Gantt view loaded");
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
      ? tasks.filter((t) => t.trade === userTrade)
      : tasks;

  const datedTasks = visibleTasks.filter((t) => t.start_date && t.end_date);

  const range = useMemo(() => {
    if (datedTasks.length === 0) {
      return {
        start: new Date(),
        end: new Date(),
        days: 1
      };
    }

    const starts = datedTasks.map((t) => new Date(t.start_date as string));
    const ends = datedTasks.map((t) => new Date(t.end_date as string));

    const start = new Date(Math.min(...starts.map((d) => d.getTime())));
    const end = new Date(Math.max(...ends.map((d) => d.getTime())));

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
      </div>

      <div className="card no-print">
        <h2>Select Site</h2>

        <select
          value={selectedSite}
          onChange={(e) => handleSiteChange(e.target.value)}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.site_name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <h2>Programme Timeline</h2>

        <p>
          {range.start.toLocaleDateString("en-GB")} →{" "}
          {range.end.toLocaleDateString("en-GB")}
        </p>

        {datedTasks.length === 0 && <p>No dated tasks to show.</p>}

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

                <div className="gantt-track">
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
                      <div
                        key={task.id}
                        className="gantt-bar"
                        style={{
                          left: `${offset}%`,
                          width: `${width}%`,
                          background: getBarColour(task.status)
                        }}
                        title={`${task.trade} - ${task.task_name}`}
                      >
                        {task.trade} - {task.task_name}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
