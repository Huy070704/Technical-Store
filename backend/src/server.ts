import "dotenv/config";
import App from "./app";

const app = new App();
app.start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
