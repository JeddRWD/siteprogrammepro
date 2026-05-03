"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function SuggestedEditsContent() {
  const params = useSearchParams();
  const taskId = params.get("taskId");

  const [task, setTask] = useState<any>(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function loadTask() {
    if (!taskId) {
      setMessage("No task selected.");
      return;
    }

    const { data, error } = await supabase
      .from("programme_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) {
      setMessage("Error loading task: " + error.message);
      return;
    }

    setTask(data);
  }

  async function submitEdit() {
    if (!taskId || !task) return;

    const { error } = await supabase.from("suggested_edits").insert({
      task_id: taskId,
      current_start_date: task.start_date,
      current_end_date: task.end_date,
      suggested_start_date: newStart || null,
      suggested_end_date: newEnd || null,
      reason,
      status: "pending"
    });

    if (error) {
      setMessage("Error: " + error.message);
      return;
    }

    setMessage("Suggestion submitted");
    setNewStart("");
    setNewEnd("");
    setReason("");
  }

  useEffect(() => {
    loadTask();
  }, [taskId]);

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Suggest Change</h1>

      <p style={{ background: "#eee", padding: 10 }}>{message}</p>

      {!task && <p>Loading task...</p>}

      {task && (
        <div style={{ marginTop: 20 }}>
          <h2>{task.task_name}</h2>
          <p>Plot: {task.plot_number}</p>
          <p>
            Current: {task.start_date} → {task.end_date}
          </p>

          <input
            type="date"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            style={{ padding: 10, marginRight: 10 }}
          />

          <input
            type="date"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            style={{ padding: 10, marginRight: 10 }}
          />

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for change"
            style={{ marginTop: 20, padding: 10, width: "100%" }}
          />

          <br />

          <button onClick={submitEdit} style={{ marginTop: 20, padding: 10 }}>
            Submit Suggestion
          </button>
        </div>
      )}
    </main>
  );
}

export default function SuggestedEdits() {
  return (
    <Suspense fallback={<p style={{ padding: 40 }}>Loading...</p>}>
      <SuggestedEditsContent />
    </Suspense>
  );
}
