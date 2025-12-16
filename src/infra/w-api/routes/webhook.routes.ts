import { Router } from "express";
import { WebhookController } from "../webhook/webhook.controller";

export const webhookRouter = Router();
const controller = new WebhookController();

const validateWebhook = (req: any, res: any, next: any) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            ok: false,
            error: "Request body is empty"
        });
    }
    next();
};

webhookRouter.post("/receive-message", validateWebhook, (req, res) => {
    controller.handle(req, res);
});

webhookRouter.post("/test-webhook", (req, res) => {
    const testData = {
        sender: { id: "5511999999999" },
        msgContent: {
            conversation: "Test message from webhook"
        },
        timestamp: Date.now()
    };
    
    console.log("🧪 Test webhook triggered");
    
    res.status(200).json({
        ok: true,
        message: "Test webhook received",
        testData,
        processed: true
    });
});