export default function Dashboard() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Dashboard</h1>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <a href="/sites">Sites</a>
        <a href="/programme">Programme</a>
        <a href="/suggested-edits">Suggested Edits</a>
      </div>

      <div style={{ marginTop: 30 }}>
        <h2>Overview</h2>
        <p>Sites: 0</p>
        <p>Programme Tasks: 0</p>
        <p>Pending Suggested Edits: 0</p>
      </div>
    </main>
  );
}
