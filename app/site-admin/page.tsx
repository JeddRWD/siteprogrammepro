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

type ProgrammeTemplateItem = {
  id: string;
  site_id: string;
  sequence_order: number;
  task_name: string;
  trade: string | null;
  duration_working_days: number;
  gap_working_days: number;
  exclude_weekends: boolean;
};

export default function SiteAdmin() {
  const [role, setRole] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState("");

  const [plots, setPlots] = useState<Plot[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [programmeTemplateItems, setProgrammeTemplateItems] = useState<
    ProgrammeTemplateItem[]
  >([]);

  const [plotNumber, setPlotNumber] = useState("");
  const [plotName, setPlotName] = useState("");

  const [tradeName, setTradeName] = useState("");
  const [tradeColour, setTradeColour] = useState("#1368b3");

  const [taskTemplateName, setTaskTemplateName] = useState("");

  const [templateOrder, setTemplateOrder] = useState("1");
  const [templateTaskName, setTemplateTaskName] = useState("");
  const [templateTrade, setTemplateTrade] = useState("");
  const [templateDuration, setTemplateDuration] = useState("1");
  const [templateGap, setTemplateGap] = useState("0");
  const [templateExcludeWeekends, setTemplateExcludeWeekends] = useState(true);

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
    await Promise.all([
      loadPlots(siteId),
      loadTrades(siteId),
      loadTaskTemplates(siteId),
      loadProgrammeTemplateItems(siteId)
    ]);
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

    if (data && data.length > 0) {
      setTemplateTrade(data[0].trade_name);
    }
  }

  async function loadTaskTemplates(siteId: string) {
    const { data } = await supabase
      .from("task_templates")
      .select("*")
      .eq("site_id", siteId)
      .order("task_name", { ascending: true });

    setTaskTemplates(data || []);

    if (data && data.length > 0) {
      setTemplateTaskName(data[0].task_name);
    }
  }

  async function loadProgrammeTemplateItems(siteId: string) {
    const { data } = await supabase
      .from("programme_template_items")
      .select("*")
      .eq("site_id", siteId)
      .order("sequence_order", { ascending: true });

    setProgrammeTemplateItems(data || []);
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
async function addProgrammeTemplateItem() {
  setMessage("Add Template Item clicked...");

  if (!canAdmin) {
    setMessage("You do not have permission.");
    return;
  }

  if (!selectedSite) {
    setMessage("No site selected.");
    return;
  }

  if (!templateTaskName) {
    setMessage("No task selected.");
    return;
  }

  if (!templateTrade) {
    setMessage("No trade selected.");
    return;
  }

  const duration = Number(templateDuration);
  const gap = Number(templateGap);
  const order = Number(templateOrder);

  if (Number.isNaN(duration) || duration < 1) {
    setMessage("Duration must be at least 1 working day.");
    return;
  }

  if (Number.isNaN(gap) || gap < 0) {
    setMessage("Gap must be 0 or more working days.");
    return;
  }

  if (Number.isNaN(order) || order < 1) {
    setMessage("Order must be 1 or more.");
    return;
  }

  const { data, error } = await supabase
    .from("programme_template_items")
    .insert({
      site_id: selectedSite,
      sequence_order: order,
      task_name: templateTaskName,
      trade: templateTrade,
      duration_working_days: duration,
      gap_working_days: gap,
      exclude_weekends: templateExcludeWeekends
    })
    .select();

  if (error) {
    setMessage("Programme template error: " + error.message);
    return;
  }

  setMessage("Programme template item added: " + data?.[0]?.task_name);

  setTemplateOrder(String(programmeTemplateItems.length + 2));
  setTemplateDuration("1");
  setTemplateGap("0");
  setTemplateExcludeWeekends(true);

  loadProgrammeTemplateItems(selectedSite);
}

  async function deleteProgrammeTemplateItem(id: string) {
    if (!window.confirm("Delete this programme template item?")) return;

    const { error } = await supabase
      .from("programme_template_items")
      .delete()
      .eq("id", id);

    if (error) {
      return setMessage("Delete template item error: " + error.message);
    }

    setMessage("Programme template item deleted");
    loadProgrammeTemplateItems(selectedSite);
  }

  async function updateProgrammeTemplateItem(item: ProgrammeTemplateItem) {
    const { error } = await supabase
      .from("programme_template_items")
      .update({
        sequence_order: item.sequence_order,
        task_name: item.task_name,
        trade: item.trade,
        duration_working_days: item.duration_working_days,
        gap_working_days: item.gap_working_days,
        exclude_weekends: item.exclude_weekends
      })
      .eq("id", item.id);

    if (error) {
      return setMessage("Update template item error: " + error.message);
    }

    setMessage("Programme template item updated");
    loadProgrammeTemplateItems(selectedSite);
  }

  function updateTemplateItemLocal(
    id: string,
    field: keyof ProgrammeTemplateItem,
    value: string | number | boolean
  ) {
    setProgrammeTemplateItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
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
                      {" "}
                      {trade.colour}
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

          <div className="card">
            <h2>Add Programme Template Item</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="number"
                min="1"
                placeholder="Order"
                value={templateOrder}
                onChange={(event) => setTemplateOrder(event.target.value)}
                style={{ width: 90 }}
              />

              <select
                value={templateTaskName}
                onChange={(event) => setTemplateTaskName(event.target.value)}
              >
                <option value="">Select task</option>
                {taskTemplates.map((task) => (
                  <option key={task.id} value={task.task_name}>
                    {task.task_name}
                  </option>
                ))}
              </select>

              <select
                value={templateTrade}
                onChange={(event) => setTemplateTrade(event.target.value)}
              >
                <option value="">Select trade</option>
                {trades.map((trade) => (
                  <option key={trade.id} value={trade.trade_name}>
                    {trade.trade_name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                placeholder="Duration working days"
                value={templateDuration}
                onChange={(event) => setTemplateDuration(event.target.value)}
                style={{ width: 180 }}
              />

              <input
                type="number"
                min="0"
                placeholder="Gap working days"
                value={templateGap}
                onChange={(event) => setTemplateGap(event.target.value)}
                style={{ width: 160 }}
              />

              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={templateExcludeWeekends}
                  onChange={(event) =>
                    setTemplateExcludeWeekends(event.target.checked)
                  }
                />
                Exclude weekends
              </label>

              <button type="button" onClick={addProgrammeTemplateItem}>
                Add Template Item
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Programme Template</h2>

            {programmeTemplateItems.length === 0 && (
              <p>No programme template items added yet.</p>
            )}

            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Task</th>
                  <th>Trade</th>
                  <th>Duration</th>
                  <th>Gap</th>
                  <th>Exclude Weekends</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {programmeTemplateItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.sequence_order}
                        onChange={(event) =>
                          updateTemplateItemLocal(
                            item.id,
                            "sequence_order",
                            Number(event.target.value)
                          )
                        }
                        style={{ width: 80 }}
                      />
                    </td>

                    <td>
                      <select
                        value={item.task_name}
                        onChange={(event) =>
                          updateTemplateItemLocal(
                            item.id,
                            "task_name",
                            event.target.value
                          )
                        }
                      >
                        {taskTemplates.map((task) => (
                          <option key={task.id} value={task.task_name}>
                            {task.task_name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={item.trade || ""}
                        onChange={(event) =>
                          updateTemplateItemLocal(
                            item.id,
                            "trade",
                            event.target.value
                          )
                        }
                      >
                        {trades.map((trade) => (
                          <option key={trade.id} value={trade.trade_name}>
                            {trade.trade_name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.duration_working_days}
                        onChange={(event) =>
                          updateTemplateItemLocal(
                            item.id,
                            "duration_working_days",
                            Number(event.target.value)
                          )
                        }
                        style={{ width: 100 }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.gap_working_days}
                        onChange={(event) =>
                          updateTemplateItemLocal(
                            item.id,
                            "gap_working_days",
                            Number(event.target.value)
                          )
                        }
                        style={{ width: 100 }}
                      />
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={item.exclude_weekends}
                        onChange={(event) =>
                          updateTemplateItemLocal(
                            item.id,
                            "exclude_weekends",
                            event.target.checked
                          )
                        }
                      />
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => updateProgrammeTemplateItem(item)}
                      >
                        Save
                      </button>{" "}
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deleteProgrammeTemplateItem(item.id)}
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
