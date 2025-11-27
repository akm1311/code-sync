import express from "express";
import { registerRoutes } from "./server/routes.js";
import { setupVite, log } from "./server/vite.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
    const server = await registerRoutes(app);

    // Setup Vite for local development
    await setupVite(app, server);

    const port = 5000;
    server.listen(port, "0.0.0.0", () => {
        log(`🚀 Server running at http://localhost:${port}`);
        log(`📝 Open in browser to start coding!`);
    });
})();
