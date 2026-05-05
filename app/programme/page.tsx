"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

type Site = { id: string; site_name: string; };
type Task = { id: string; plot_number: string | null; task_name: string | null; trade: string | null; start_date: string | null; end_date: string | null; status: string | null; };

function getStatusStyle(status: string | null) {
  switch (status) {
    case "Complete": return { background: "#d4edda", color: "#155724" };
    case "In Progress": return { background: "#fff3cd", color: "#856404" };
    case "Delayed": return { background: "#f8d7da", color: "#721c24" };
    case "At Risk": return { background: "#ffe5b4", color: "#8a5a00" };
    default: return { background: "#e9f3ff", color: "#0f2747" };
  }
}

export default function Programme() {
  const [role, setRole] = useState("");
  const [userTrade, setUserTrade] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [plotNumber, setPlotNumber] = useState("");
  const [taskName, setTaskName] = useState("");
  const [trade, setTrade] = useState("Electrical");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Planned");
  const [message, setMessage] = useState("");

  async function loadRole() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setMessage("Not logged in. Please login first."); return; }
    const { data, error } = await supabase.from("profiles").select("role, trade").eq("id", userData.user.id).single();
    if (error) { setMessage("Role load error: " + error.message); return; }
    setRole(data.role); setUserTrade(data.trade || "");
  }

  async function loadSites() {
    const { data } = await supabase.from("sites").select("id, site_name").order("created_at", { ascending: false });
    setSites(data || []);
    if (data && data.length > 0 && !selectedSite) { setSelectedSite(data[0].id); loadTasks(data[0].id); }
  }

  async function loadTasks(siteId: string) {
    setMessage("Loading programme...");
    const { data, error } = await supabase.from("programme_tasks").select("*").eq("site_id", siteId).order("start_date", { ascending: true });
    if (error) { setMessage("Error: " + error.message); return; }
    setTasks(data || []); setMessage("Programme loaded");
  }

  const visibleTasks = role === "subcontractor" && userTrade ? tasks.filter((task) => task.trade === userTrade) : tasks;

  async function addTask() {
    if (role === "subcontractor") { setMessage("Subcontractors cannot add programme tasks."); return; }
    if (!plotNumber || !taskName) { setMessage("Enter plot + task"); return; }
    setMessage("Adding task...");
    const { error } = await supabase.from("programme_tasks").insert({ site_id: selectedSite, plot_number: plotNumber, task_name: taskName, trade, start_date: startDate || null, end_date: endDate || null, status });
    if (error) { setMessage("Error: " + error.message); return; }
    setPlotNumber(""); setTaskName(""); setTrade("Electrical"); setStartDate(""); setEndDate(""); setStatus("Planned");
    loadTasks(selectedSite);
  }

  function handleSiteChange(siteId: string) { setSelectedSite(siteId); loadTasks(siteId); }
  useEffect(() => { loadRole(); loadSites(); }, []);

  return (
    <main>
      <h1>Programme Table</h1>
      <div className="status-box">Status: {message}<br />Role: {role || "Loading..."} {role === "subcontractor" ? ` | Trade: ${userTrade || "Not set"}` : ""}</div>
      <div className="card"><h2>Programme Views</h2><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><a href="/programme-visual"><button>Visual Board</button></a><a href="/programme-gantt"><button>Gantt View</button></a><a href="/programme-print"><button>Print Programme</button></a></div></div>
      <div className="card"><h2>Select Site</h2><select value={selectedSite} onChange={(e) => handleSiteChange(e.target.value)}>{sites.map((site) => <option key={site.id} value={site.id}>{site.site_name}</option>)}</select></div>
      {role !== "subcontractor" && <div className="card"><h2>Add Task</h2><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><input placeholder="Plot" value={plotNumber} onChange={(e) => setPlotNumber(e.target.value)} /><input placeholder="Task" value={taskName} onChange={(e) => setTaskName(e.target.value)} /><select value={trade} onChange={(e) => setTrade(e.target.value)}><option>Electrical</option><option>Plumbing</option><option>Drylining</option><option>Joinery</option><option>Brickwork</option><option>Roofing</option><option>Decorating</option><option>Groundworks</option></select><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Planned</option><option>In Progress</option><option>Complete</option><option>At Risk</option><option>Delayed</option></select><button onClick={addTask}>Add</button></div></div>}
      {role === "subcontractor" && <div className="card"><h2>Subcontractor View</h2><p>You can view {userTrade || "your"} tasks and suggest changes, but cannot add or edit tasks directly.</p></div>}
      <div className="card"><h2>Programme Tasks</h2>{visibleTasks.length === 0 && <p>No tasks to show.</p>}<table><thead><tr><th>Plot</th><th>Task</th><th>Trade</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead><tbody>{visibleTasks.map((task) => <tr key={task.id}><td>{task.plot_number}</td><td>{task.task_name}</td><td>{task.trade}</td><td>{formatDate(task.start_date)}</td>
<td>{formatDate(task.end_date)}</td><td><span className="badge" style={getStatusStyle(task.status)}>{task.status}</span></td><td><a href={`/suggested-edits?taskId=${task.id}`}>Suggest Change</a></td></tr>)}</tbody></table></div>
    </main>
  );
}
