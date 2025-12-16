import { Request, Response } from "express";
import { SendTextService } from "@/infra/services/send-text.service";
import { ReceiverDto } from "@/modules/dto/receiver-dto";
import { processarMensagem } from "@/modules/bots/clinicobot";

const sendTextService = new SendTextService(
  `${process.env.INSTANCE_ID}`,
  `${process.env.W_API_KEY}`
);

export class WebhookController {
  async handle(req: Request, res: Response) {
    try {
      const event = req.body as ReceiverDto;

      console.log("📥 Webhook recebido:", JSON.stringify(event, null, 2));

      const phone = event?.sender?.id;
      const text =
        event?.msgContent?.extendedTextMessage?.text ||
        event?.msgContent?.conversation ||
        null;

      if (!phone || !text) {
        console.warn("Webhook recebido sem telefone ou sem texto.");
        return res.status(400).json({
          ok: false,
          error: "Webhook inválido: faltando phone ou text",
        });
      }

      console.log(`📱 Mensagem do usuário (${phone}): "${text}"`);

      const resposta = await processarMensagem(phone, text);

      console.log(`🤖 Resposta gerada para ${phone}: ${resposta}`);

      await sendTextService.sendText(phone, resposta);

      return res.status(200).json({
        ok: true,
        receivedText: text,
        responseText: resposta,
        phone,
      });

    } catch (error: any) {
      console.error("❌ Erro no WebhookController:", error);

      return res.status(500).json({
        ok: false,
        error: "Internal Server Error",
        details: error.message,
      });
    }
  }
}
