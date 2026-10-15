import('apminsight')
  .then(({ default: AgentAPI }) => AgentAPI.config())
  .catch(() => console.log('APM not available in this environment'));

import app from "./app.js";

// Hosts like Render pick the port and pass it in PORT.
const PORT = Number(process.env.PORT) || 8000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
