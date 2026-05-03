export default function Programme() {
  const tasks = [
    {
      plot: "001",
      task: "1st Fix Electrical",
      trade: "Electrical",
      start: "2026-05-06",
      end: "2026-05-07",
      status: "Planned"
    },
    {
      plot: "001",
      task: "Plasterboard",
      trade: "Drylining",
      start: "2026-05-10",
      end: "2026-05-12",
      status: "At Risk"
    },
    {
      plot: "002",
      task: "2nd Fix Electrical",
      trade: "Electrical",
      start: "2026-05-18",
      end: "2026-05-19",
      status: "Planned"
    }
  ];

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Programme</h1>

      <table border={1} cellPadding={10} style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th>Plot</th>
            <th>Task</th>
            <th>Trade</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task, index) => (
            <tr key={index}>
              <td>{task.plot}</td>
              <td>{task.task}</td>
              <td>{task.trade}</td>
              <td>{task.start}</td>
              <td>{task.end}</td>
              <td>{task.status}</td>
              <td>
                <a href="/suggested-edits">Suggest Change</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
