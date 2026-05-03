"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [sites, setSites] = useState(0);
  const [tasks, setTasks] = useState(0);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setMessage("Loading dashboard...");

    const { count: siteCount } = await supabase
      .from("sites")
      .select("*", { count: "exact", head: true });

    const { count: taskCount } = await supabase
      .from("programme_tasks")
      .select("*", { count: "exact", head: true });

    const { count: pendingCount } = await supabase
      .from("suggested_edits")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    setSites(siteCount || 0);
    setTasks(taskCount || 0);
    setPending(pendingCount || 0);
    setMessage("Dashboard loaded");
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Welcome to SiteProgrammePro.</p>

      <div className="status-box">Status: {message}</div>

      <div className="grid">
        <div className="stat">
          <span>Total Sites</span>
          <strong>{sites}</strong>
        </div>

        <div className="stat">
          <span>Programme Tasks</span>
          <strong>{tasks}</strong>
        </div>

        <div className="stat">
          <span>Pending Approvals</span>
          <strong>{pending}</strong>
        </div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/sites">
            <button>Add / View Sites</button>
          </a>

          <a href="/programme">
            <button>Open Programme</button>
          </a>

          <a href="/approvals">
            <button>Review Approvals</button>
          </a>
        </div>
      </div>

      <div className="card">
        <h2>Core Workflow</h2>
        <p>
          Create sites, add programme tasks, allow subcontractors to suggest
          changes, then approve or reject those changes.
        </p>
      </div>
    </main>
  );
}
