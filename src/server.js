require("dotenv").config();
const app = require("./app");
const config = require("./config");

const server = app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});

function shutdown() {
  console.log("Shutting down server...");
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
