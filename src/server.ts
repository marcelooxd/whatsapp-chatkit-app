import dotenv from "dotenv";
import express from "express";
import { webhookRouter } from "./infra/w-api/routes/webhook.routes";

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.use("/api", webhookRouter);

app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.path,
        method: req.method
    });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined
    });
});

app.listen(PORT, () => {
    console.log("🚀 WhatsApp Bot Webhook Server iniciado!");
    console.log(`📍 Porta: ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log(`📱 Webhook: http://localhost:${PORT}/api/receive-message`);
});