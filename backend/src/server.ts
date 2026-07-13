import "dotenv/config";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import App from "./app";

const app = new App();
app.start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
