export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>SiteProgrammePro</h1>
      <p style={{ fontSize: 18 }}>
        Create, share and manage site programmes without messy spreadsheets.
      </p>

      <a href="/dashboard">
        <button style={{ padding: 14, marginTop: 25 }}>
          Open Dashboard
        </button>
      </a>
    </main>
  );
}
