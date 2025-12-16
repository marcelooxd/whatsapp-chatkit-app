import OpenAI from "openai";
import dotenv from 'dotenv';
import { runWorkflow, WorkflowInput } from "../modules/bots/clinicobot";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface OpenAIResponse {
  text: string;
  success: boolean;
  error?: string;
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ConversationContext {
  chatId: string;
  contactName: string;
  timestamp: string;
  platform: string;
  messageType: string;
  isGroup: boolean;
}

export async function runChatKitWorkflow(
  workflowId: string,
  userInput: string,
): Promise<OpenAIResponse> {
   try {
    const input: WorkflowInput = { input_as_text: userInput};
    const responsesChatkit = await runWorkflow(input);
    const workflowText = await responsesChatkit.output_text;

    return {
      text: workflowText,
      success: true
    };

  } catch (error) {
    console.error(`Erro ao executar workflow ${workflowId}:`, error);
    return {
      text: "Desculpe, ocorreu um erro ao processar sua solicitação com o ChatKit.",
      success: false,
      error: (error as Error).message
    };
  }
}

export async function sendMessageToOpenAI(
  message: string,
): Promise<OpenAIResponse> {
  const defaultWorkflowId = process.env.WORKFLOW_ID || "wf_68efd98836548190a10ffc48e39964e30d2140404e365122";
  return await runChatKitWorkflow(defaultWorkflowId, message);
}

/**
 * Limita o histórico de conversa para evitar tokens excessivos
 * @param history - Histórico atual
 * @param maxLength - Tamanho máximo (padrão: 20)
 * @returns ConversationMessage[]
 */
export function limitConversationHistory(
  history: ConversationMessage[],
  maxLength: number = 25
): ConversationMessage[] {
  if (history.length <= maxLength) {
    return history;
  }
   
  // Mantém a mensagem do sistema e as últimas mensagens
  const systemMessage = history.find(msg => msg.role === 'system');
  const recentMessages = history.slice(-maxLength + 1);
  return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
}