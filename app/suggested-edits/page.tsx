export default function SuggestedEdits() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Suggested Edits</h1>

      <div style={{ marginTop: 20, border: "1px solid #ccc", padding: 20 }}>
        <h2>Plot 001 - 1st Fix Electrical</h2>
        <p>Current date: 2026-05-06 to 2026-05-07</p>
        <p>Suggested date: 2026-05-08 to 2026-05-09</p>
        <p>Reason: Joists not ready.</p>

        <button style={{ padding: 10, marginRight: 10 }}>Approve</button>
        <button style={{ padding: 10 }}>Reject</button>
      </div>
    </main>
  );
}
