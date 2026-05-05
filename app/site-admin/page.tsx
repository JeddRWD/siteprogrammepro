"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Site = {
  id: string;
  site_name: string;
};

type Plot = {
  id: string;
  site_id: string;
  plot_number: string;
  plot_name: string | null;
};

type Trade = {
  id: string;
  site_id: string;
  trade_name: string;
  colour: string;
};

type TaskTemplate = {
  id: string;
  site_id: string;
  task_name: string;
};

export default function SiteAdmin() {
  const [role, setRole] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [plots, setPlots] = useState<Plot[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);

  const [plotNumber, setPlotNumber] = useState("");
  const [plotName, setPlotName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [tradeColour, setTradeColour] = useState("#1368b3");
  const [taskTemplateName, setTaskTemplateName] = useState("");
  const [message, setMessage] = useState("");

  const canAdmin = role === "site_manager" || role === "contracts_manager";

  async function loadRole() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      setMessage("Not logged in.");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    setRole(data?.role || "");
  }

  async function loadSites() {
    const { data } = await supabase
      .from("sites")
      .select("id, site_name")
      .order("created_at", { ascending: false });

    setSites(data || []);

    if (data && data.length > 0) {
      setSelectedSite(data[0].id);
      loadSiteAdminData(data[0].id);
    }
  }

  async function loadSiteAdminData(siteId: string) {
    loadPlots(siteId);
    loadTrades(siteId);
    loadTaskTemplates(siteId);
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

  function changeSite(siteId: string) {
    setSelectedSite(siteId);
    loadSiteAdminData(siteId);
  }

  async function addPlot() {
    if (!canAdmin) return setMessage("You do not have permission.");
    if (!selectedSite || !plotNumber) return setMessage("Enter a plot number.");

    const { error } = await supabase.from("plots").insert({
      site_id: selectedSite,
      plot_number: plotNumber,
      plot_name: plotName || null
    });

    if (error) return setMessage("Plot error: " + error.message);

    setPlotNumber("");
    setPlotName("");
    setMessage("Plot added");
    loadPlots(selectedSite);
  }

  async function deletePlot(id: string) {
    if (!window.confirm("Delete this plot?")) return;

    const { error } = await supabase.from("plots").delete().eq("id", id);

    if (error) return setMessage("Delete plot error: " + error.message);

    setMessage("Plot deleted");
    loadPlots(selectedSite);
  }

  async function addTrade() {
    if (!canAdmin) return setMessage("You do not have permission.");
    if (!selectedSite || !tradeName) return setMessage("Enter a trade name.");

    const { error } = await supabase.from("trades").insert({
      site_id: selectedSite,
      trade_name: tradeName,
      colour: tradeColour
    });

    if (error) return setMessage("Trade error: " + error.message);

    setTradeName("");
    setTradeColour("#1368b3");
    setMessage("Trade added");
    loadTrades(selectedSite);
  }

  async function deleteTrade(id: string) {
    if (!window.confirm("Delete this trade?")) return;

    const { error } = await supabase.from("trades").delete().eq("id", id);

    if (error) return setMessage("Delete trade error: " + error.message);

    setMessage("Trade deleted");
    loadTrades(selectedSite);
  }

  async function addTaskTemplate() {
    if (!canAdmin) return setMessage("You do not have permission.");

    if (!selectedSite || !taskTemplateName) {
      return setMessage("Enter a task name.");
    }

    const { error } = await supabase.from("task_templates").insert({
      site_id: selectedSite,
      task_name: taskTemplateName
    });

    if (error) return setMessage("Task template error: " + error.message);

    setTaskTemplateName("");
    setMessage("Task template added");
    loadTaskTemplates(selectedSite);
  }

  async function deleteTaskTemplate(id: string) {
    if (!window.confirm("Delete this task template?")) return;

    const { error } = await supabase
      .from("task_templates")
      .delete()
      .eq("id", id);

    if (error) return setMessage("Delete task template error: " + error.message);

    setMessage("Task template deleted");
    loadTaskTemplates(selectedSite);
  }

  useEffect(() => {
    loadRole();
    loadSites();
  }, []);

  return (
    <main>
      <h1>Site Admin</h1>

      <div className="status-box">
        Status: {message}
        <br />
        Role: {role || "Loading..."}
      </div>

      {!canAdmin && (
        <div className="card">
          <h2>Restricted Access</h2>
          <p>Only site managers and contracts managers can use site admin.</p>
        </div>
      )}

      {canAdmin && (
        <>
          <div className="card">
            <h2>Select Site</h2>

            <select
              value={selectedSite}
              onChange={(event) => changeSite(event.target.value)}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.site_name}
                </option>
              ))}
            </select>
          </div>

          <div className="card">
            <h2>Add Plot</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                placeholder="Plot number"
                value={plotNumber}
                onChange={(event) => setPlotNumber(event.target.value)}
              />

              <input
                placeholder="Plot name / house type optional"
                value={plotName}
                onChange={(event) => setPlotName(event.target.value)}
              />

              <button type="button" onClick={addPlot}>
                Add Plot
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Plots</h2>

            {plots.length === 0 && <p>No plots added yet.</p>}

            <table>
              <thead>
                <tr>
                  <th>Plot</th>
                  <th>Name / House Type</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {plots.map((plot) => (
                  <tr key={plot.id}>
                    <td>{plot.plot_number}</td>
                    <td>{plot.plot_name || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deletePlot(plot.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Add Trade</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                placeholder="Trade name"
                value={tradeName}
                onChange={(event) => setTradeName(event.target.value)}
              />

              <input
                type="color"
                value={tradeColour}
                onChange={(event) => setTradeColour(event.target.value)}
              />

              <button type="button" onClick={addTrade}>
                Add Trade
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Trades</h2>

            {trades.length === 0 && <p>No trades added yet.</p>}

            <table>
              <thead>
                <tr>
                  <th>Trade</th>
                  <th>Colour</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{trade.trade_name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 30,
                          height: 20,
                          background: trade.colour,
                          borderRadius: 6,
                          border: "1px solid #ccc"
                        }}
                      />
                      {" "}{trade.colour}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deleteTrade(trade.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Add Task Template</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                placeholder="Task name e.g. 1st Fix Electrical"
                value={taskTemplateName}
                onChange={(event) => setTaskTemplateName(event.target.value)}
              />

              <button type="button" onClick={addTaskTemplate}>
                Add Task Template
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Task Templates</h2>

            {taskTemplates.length === 0 && <p>No task templates added yet.</p>}

            <table>
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {taskTemplates.map((task) => (
                  <tr key={task.id}>
                    <td>{task.task_name}</td>
                    <td>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deleteTaskTemplate(task.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
