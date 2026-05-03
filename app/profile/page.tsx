"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("site_manager");
  const [message, setMessage] = useState("");

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) return;

    setUser(userData.user);

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (error) {
      setMessage("Error loading profile");
      return;
    }

    setRole(data.role);
  }

  async function updateRole() {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Role updated");
  }

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <main>
      <h1>Profile</h1>

      <div className="status-box">Status: {message}</div>

      <div className="card">
        <h2>Your Role</h2>

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="site_manager">Site Manager</option>
          <option value="subcontractor">Subcontractor</option>
          <option value="contracts_manager">Contracts Manager</option>
        </select>

        <br /><br />

        <button onClick={updateRole}>Save Role</button>
      </div>
    </main>
  );
}