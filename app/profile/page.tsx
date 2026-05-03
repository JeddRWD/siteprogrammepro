"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("site_manager");
  const [message, setMessage] = useState("Loading profile...");

  async function loadProfile() {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setMessage("User error: " + userError.message);
      return;
    }

    if (!userData?.user) {
      setMessage("No logged-in user found. Please login again.");
      return;
    }

    setUser(userData.user);

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (error) {
      setMessage("Profile load error: " + error.message);
      return;
    }

    setRole(data.role || "site_manager");
    setMessage("Profile loaded");
  }

  async function updateRole() {
    setMessage("Save button clicked...");

    if (!user) {
      setMessage("No user loaded. Please refresh or login again.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ role: role })
      .eq("id", user.id)
      .select();

    if (error) {
      setMessage("Update error: " + error.message);
      return;
    }

    setMessage("Role updated to: " + role);
    console.log("Updated profile:", data);
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

        <br />
        <br />

        <button type="button" onClick={updateRole}>
          Save Role
        </button>
      </div>
    </main>
  );
}
