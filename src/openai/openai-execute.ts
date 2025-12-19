import OpenAI from "openai";
import dotenv from 'dotenv';
import { runWorkflow, WorkflowInput, WorkflowState } from "../modules/bots/clinicobot";

dotenv.config();

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
  workflowInput: WorkflowInput,
): Promise<OpenAIResponse> {
   try {
    const responsesChatkit = await runWorkflow(workflowInput);
    console.log("mensagem devolvida: ", responsesChatkit.output_text)
    return {
      text: responsesChatkit.output_text,
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
  phone: string,
  message: string,
  history: ConversationMessage[],
  state: WorkflowState
): Promise<OpenAIResponse> {
  const defaultWorkflowId = `${process.env.WORKFLOW_ID}`;
  return await runChatKitWorkflow(defaultWorkflowId, { input_as_text: message, phone, history, state });
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