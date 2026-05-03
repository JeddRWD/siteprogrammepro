"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type SuggestedEdit = {
  id: string;
  task_id: string;
  current_start_date: string | null;
  current_end_date: string | null;
  suggested_start_date: string | null;
  suggested_end_date: string | null;
  reason: string | null;
  status: string | null;
  programme_tasks: {
    plot_number: string | null;
    task_name: string | null;
    trade: string | null;
  } | null;
};

export default function Approvals() {
  const [edits, setEdits] = useState<SuggestedEdit[]>([]);
  const [message, setMessage] = useState("");

  async function loadEdits() {
    setMessage("Loading pending approvals...");

    const { data, error } = await supabase
      .from("suggested_edits")
      .select(`
        id,
        task_id,
        current_start_date,
        current_end_date,
        suggested_start_date,
        suggested_end_date,
        reason,
        status,
        programme_tasks (
          plot_number,
          task_name,
          trade
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Load error: " + error.message);
      return;
    }

    // 👇 THIS IS THE FIX
    setEdits((data as unknown as SuggestedEdit[]) || []);
    setMessage("Pending approvals loaded");
  }

  async function approveEdit(edit: SuggestedEdit) {
    setMessage("Approving change...");

    const { error: taskError } = await supabase
      .from("programme_tasks")
      .update({
        start_date: edit.suggested_start_date,
        end_date: edit.suggested_end_date,
        status: "Planned"
      })
      .eq("id", edit.task_id);

    if (taskError) {
      setMessage("Programme update error: " + taskError.message);
      return;
    }

    const { error: editError } = await supabase
      .from("suggested_edits")
      .update({ status: "approved" })
      .eq("id", edit.id);

    if (editError) {
      setMessage("Suggestion update error: " + editError.message);
      return;
    }

    setMessage("Change approved and programme updated");
    loadEdits();
  }

  async function rejectEdit(editId: string) {
    setMessage("Rejecting change...");

    const { error } = await supabase
      .from("suggested_edits")
      .update({ status: "rejected" })
      .eq("id", editId);

    if (error) {
      setMessage("Reject error: " + error.message);
      return;
    }

    setMessage("Change rejected");
    loadEdits();
  }

  useEffect(() => {
    loadEdits();
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Approvals</h1>

      <p style={{ background: "#eee", padding: 10 }}>
        Status: {message}
      </p>

      {edits.length === 0 && <p>No pending approvals.</p>}

      {edits.map((edit) => (
        <div
          key={edit.id}
          style={{
            border: "1px solid #ccc",
            padding: 20,
            marginBottom: 15
          }}
        >
          <h2>
            Plot {edit.programme_tasks?.plot_number} -{" "}
            {edit.programme_tasks?.task_name}
          </h2>

          <p>Trade: {edit.programme_tasks?.trade}</p>

          <p>
            Current: {edit.current_start_date} → {edit.current_end_date}
          </p>

          <p>
            Suggested: {edit.suggested_start_date} → {edit.suggested_end_date}
          </p>

          <p>Reason: {edit.reason}</p>

          <button
            onClick={() => approveEdit(edit)}
            style={{ padding: 10, marginRight: 10 }}
          >
            Approve
          </button>

          <button
            onClick={() => rejectEdit(edit.id)}
            style={{ padding: 10 }}
          >
            Reject
          </button>
        </div>
      ))}
    </main>
  );
}
