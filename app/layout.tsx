import "./globals.css";

export const metadata = {
  title: "SiteProgrammePro",
  description: "Site programme management for construction teams"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-icon">SP</div>
              <div>
                <h2>SiteProgrammePro</h2>
                <p>Site programming made simple</p>
              </div>
            </div>

            <nav>
<a href="/login">Login</a>
              <a href="/profile">Profile</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/sites">Sites</a>
              <a href="/programme">Programme</a>
              <a href="/approvals">Approvals</a>
              <a href="/suggested-edits">Suggested Edits</a>
            </nav>
          </aside>

          <section className="main-content">{children}</section>
        </div>
      </body>
    </html>
  );
}
