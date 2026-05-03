export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>SiteProgrammePro</h1>
      <p>Create, share and manage site programmes without messy spreadsheets.</p>

      <a href="/dashboard">
        <button style={{ padding: 12, marginTop: 20 }}>
          Open Dashboard
        </button>
      </a>
    </main>
  );
}