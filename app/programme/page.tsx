"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Site = {
  id: string;
  site_name: string;
};

type Task = {
  id: string;
  site_id: string;
  plot_number: string | null;
  task_name: string | null;
  trade: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

export default function Programme() {
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [plotNumber, setPlotNumber] = useState("");
  const [taskName, setTaskName] = useState("");
  const [trade, setTrade] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Planned");
  const [message, setMessage] = useState("");

  async function loadSites() {
    const { data, error } = await supabase
      .from("sites")
      .select("id, site_name")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Site load error: " + error.message);
      return;
    }

    setSites(data || []);

    if (data && data.length > 0 && !selectedSite) {
      setSelectedSite(data[0].id);
      loadTasks(data[0].id);
    }
  }

  async function loadTasks(siteId: string) {
    setMessage("Loading programme tasks...");

    const { data, error } = await supabase
      .from("programme_tasks")
      .select("id, site_id, plot_number, task_name, trade, start_date, end_date, status")
      .eq("site_id", siteId)
      .order("start_date", { ascending: true });

    if (error) {
      setMessage("Task load error: " + error.message);
      return;
    }

    setTasks(data || []);
    setMessage("Programme loaded");
  }

  async function addTask() {
    if (!selectedSite) {
      setMessage("Please select a site");
      return;
    }

    if (!plotNumber.trim() || !taskName.trim()) {
      setMessage("Please enter plot number and task name");
      return;
    }

    setMessage("Adding task...");

    const { error } = await supabase.from("programme_tasks").insert({
      site_id: selectedSite,
      plot_number: plotNumber,
      task_name: taskName,
      trade,
      start_date: startDate || null,
      end_date: endDate || null,
      status
    });

    if (error) {
      setMessage("Insert error: " + error.message);
      return;
    }

    setPlotNumber("");
    setTaskName("");
    setTrade("");
    setStartDate("");
    setEndDate("");
    setStatus("Planned");

    setMessage("Task added successfully");
    loadTasks(selectedSite);
  }

  function handleSiteChange(siteId: string) {
    setSelectedSite(siteId);
    loadTasks(siteId);
  }

  useEffect(() => {
    loadSites();
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Programme</h1>

      <p style={{ background: "#eee", padding: 10 }}>
        Status: {message}
      </p>

      <div style={{ marginTop: 20 }}>
        <label>Choose Site: </label>
        <select
          value={selectedSite}
          onChange={(e) => handleSiteChange(e.target.value)}
          style={{ padding: 10, minWidth: 250 }}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.site_name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          marginTop: 30,
          padding: 20,
          border: "1px solid #ccc"
        }}
      >
        <h2>Add Programme Task</h2>

        <input
          value={plotNumber}
          onChange={(e) => setPlotNumber(e.target.value)}
          placeholder="Plot number"
          style={{ padding: 10, marginRight: 10, marginBottom: 10 }}
        />

        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="Task name"
          style={{ padding: 10, marginRight: 10, marginBottom: 10 }}
        />

        <input
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          placeholder="Trade"
          style={{ padding: 10, marginRight: 10, marginBottom: 10 }}
        />

        <br />

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ padding: 10, marginRight: 10 }}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{ padding: 10, marginRight: 10 }}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: 10, marginRight: 10 }}
        >
          <option>Planned</option>
          <option>In Progress</option>
          <option>Complete</option>
          <option>At Risk</option>
          <option>Delayed</option>
        </select>

        <button type="button" onClick={addTask} style={{ padding: 10 }}>
          Add Task
        </button>
      </div>

      <div style={{ marginTop: 30 }}>
        <h2>Programme Tasks</h2>

        {tasks.length === 0 && <p>No tasks yet for this site.</p>}

        <table border={1} cellPadding={10} style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Plot</th>
              <th>Task</th>
              <th>Trade</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.plot_number}</td>
                <td>{task.task_name}</td>
                <td>{task.trade}</td>
                <td>{task.start_date}</td>
                <td>{task.end_date}</td>
                <td>{task.status}</td>
                <td>
                  <a href="/suggested-edits">Suggest Change</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
