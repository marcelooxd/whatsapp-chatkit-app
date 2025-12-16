import { Agent } from "@openai/agents";

export const naoIdentificado = new Agent({
  name: "Não identificado",
  instructions: "Peça para o usuário enviar outra mensagem pois não conseguiu compreender qual a intenção dele. ",
  model: "gpt-4.1-mini",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

export const agenteEncerramento = new Agent({
  name: "Agente de Encerramento",
  instructions: "Encerre a conversa, se despeça do usuário e diga que se caso ele precise de uma nova ajuda, entre em contato novamente",
  model: "gpt-4.1-mini",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});