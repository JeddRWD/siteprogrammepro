export default function Sites() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Sites</h1>

      <form style={{ marginTop: 20 }}>
        <input
          placeholder="Site name"
          style={{ padding: 10, marginRight: 10 }}
        />
        <input
          placeholder="Developer"
          style={{ padding: 10, marginRight: 10 }}
        />
        <button type="button" style={{ padding: 10 }}>
          Add Site
        </button>
      </form>

      <div style={{ marginTop: 30 }}>
        <h2>Example Site</h2>
        <p>Developer: Taylor Wimpey</p>
        <a href="/programme">View Programme</a>
      </div>
    </main>
  );
}
