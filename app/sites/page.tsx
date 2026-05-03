"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Site = {
  id: string;
  site_name: string;
  developer: string | null;
  status: string | null;
};

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteName, setSiteName] = useState("");
  const [developer, setDeveloper] = useState("");
  const [message, setMessage] = useState("");

  async function loadSites() {
    setMessage("Loading sites...");

    const { data, error } = await supabase
      .from("sites")
      .select("id, site_name, developer, status")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Load error: " + error.message);
      return;
    }

    setSites(data || []);
    setMessage("Sites loaded");
  }

  async function addSite() {
    setMessage("Add site button clicked...");

    if (!siteName.trim()) {
      setMessage("Please enter a site name");
      return;
    }

    const { error } = await supabase.from("sites").insert({
      site_name: siteName,
      developer: developer,
      status: "active"
    });

    if (error) {
      setMessage("Insert error: " + error.message);
      return;
    }

    setMessage("Site added successfully");
    setSiteName("");
    setDeveloper("");
    loadSites();
  }

  useEffect(() => {
    loadSites();
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Sites</h1>

      <p style={{ background: "#eee", padding: 10 }}>
        Status: {message}
      </p>

      <div style={{ marginTop: 20 }}>
        <input
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="Site name"
          style={{ padding: 10, marginRight: 10 }}
        />

        <input
          value={developer}
          onChange={(e) => setDeveloper(e.target.value)}
          placeholder="Developer"
          style={{ padding: 10, marginRight: 10 }}
        />

        <button type="button" onClick={addSite} style={{ padding: 10 }}>
          Add Site
        </button>
      </div>

      <div style={{ marginTop: 30 }}>
        <h2>Saved Sites</h2>

        {sites.length === 0 && <p>No sites yet.</p>}

        {sites.map((site) => (
          <div
            key={site.id}
            style={{
              border: "1px solid #ccc",
              padding: 15,
              marginBottom: 10
            }}
          >
            <h3>{site.site_name}</h3>
            <p>Developer: {site.developer || "Not set"}</p>
            <p>Status: {site.status}</p>
            <a href="/programme">View Programme</a>
          </div>
        ))}
      </div>
    </main>
  );
}
