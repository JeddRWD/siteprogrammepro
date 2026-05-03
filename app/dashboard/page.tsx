"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [role, setRole] = useState("");
  const [sites, setSites] = useState(0);
  const [tasks, setTasks] = useState(0);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setMessage("Loading...");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      setMessage("Not logged in");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (!profile) {
      setMessage("No profile found");
      return;
    }

    setRole(profile.role);

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
        <h2>Your Role</h2>
        <p style={{ fontWeight: "bold" }}>{role}</p>
      </div>

      <div className="card">
        <h2>Actions</h2>

        {role === "site_manager" && (
          <>
            <a href="/sites"><button>Manage Sites</button></a>
            <a href="/programme"><button>Manage Programme</button></a>
            <a href="/approvals"><button>Approve Changes</button></a>
          </>
        )}

        {role === "subcontractor" && (
          <>
            <a href="/programme"><button>View My Tasks</button></a>
          </>
        )}

        {role === "contracts_manager" && (
          <>
            <a href="/sites"><button>View All Sites</button></a>
            <a href="/programme"><button>View Programme</button></a>
            <a href="/approvals"><button>Review Changes</button></a>
          </>
        )}
      </div>
    </main>
  );
}
