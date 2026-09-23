import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { prisma } from "./config/database.js";
import { initRealtime } from "./realtime.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");

    const httpServer = createServer(app);
    initRealtime(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`StuSecure API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
