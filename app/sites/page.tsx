"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [loading, setLoading] = useState(false);

  async function loadSites() {
    const { data, error } = await supabase
      .from("sites")
      .select("id, site_name, developer, status")
      .order("created_at", { ascending: false });

    if (!error && data) setSites(data);
  }

  async function addSite() {
    if (!siteName.trim()) return alert("Enter a site name");

    setLoading(true);

    const { error } = await supabase.from("sites").insert({
      site_name: siteName,
      developer,
      status: "active"
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

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

        <button onClick={addSite} style={{ padding: 10 }}>
          {loading ? "Adding..." : "Add Site"}
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
