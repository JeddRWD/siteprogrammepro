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
      <body>{children}</body>
    </html>
  );
}
