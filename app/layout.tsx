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
              <img
                src="/logo.png"
                alt="SiteProgrammePro"
                className="logo-full"
              />
            </div>

            <nav>
              <a href="/dashboard">Dashboard</a>
              <a href="/site-admin">Site Admin</a>
              <a href="/sites">Sites</a>
              <a href="/programme">Programme Table</a>
              <a href="/programme-visual">Visual Board</a>
              <a href="/programme-gantt">Gantt View</a>
              <a href="/programme-print">Print Programme</a>
              <a href="/approvals">Approvals</a>
              <a href="/profile">Profile</a>
              <a href="/login">Login</a>
            </nav>
          </aside>

          <section className="main-content">{children}</section>
        </div>
      </body>
    </html>
  );
}
