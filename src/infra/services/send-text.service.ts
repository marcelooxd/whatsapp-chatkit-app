import axios from "axios";

export class SendTextService {

    constructor (private readonly instanceId: string, private readonly apiKey: string) { }

    /*
        phone: Telefone que receberá a mensagem;
        message: Mensagem enviada pelo Chatbot;
        delayMessage: Delay da mensagem pré definida, por padrão é de 1 a 3 segundos;
    */ 
    async sendText(phone: string, message: string, delayMessage?: string) {
        const url = `https://api.w-api.app/v1/message/send-text?instanceId=${this.instanceId}`;
        const response = await axios.post(
            url,
            { phone, message, delayMessage },
            { headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" }
            }
        );
        return response.data;
    }
}