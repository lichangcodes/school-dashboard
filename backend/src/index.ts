import('apminsight')
  .then(({ default: AgentAPI }) => AgentAPI.config())
  .catch(() => console.log('APM not available in this environment'));

import app from "./app.js";

const PORT = 8000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
