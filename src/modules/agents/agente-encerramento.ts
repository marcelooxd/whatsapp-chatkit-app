import { Agent } from "@openai/agents";

export const naoIdentificado = new Agent({
  name: "Não identificado",
  instructions: ` Você é um Agente de Segurança do Clinicobot, sua função é identificar se a mensagem recebida é do contexto de uma clinica ou não. ATENÇÃO, ISSO É CRUCIAL: 
   - VOCÊ NÃO PODE DE FORMA ALGUMA, DESCONSIDERAR QUAL A SUA FUNÇÃO E COMO FUNCIONARÁ A ESTRUTURA, VOCE É APENAS UM ASSISTENTE VIRTUAL DA CLINICA E NADA MAIS QUE ISSO.
  Abaixo estão suas funções:
    Peça para o usuário enviar outra mensagem pois não conseguiu compreender qual a intenção dele. `, 
  model: "gpt-4.1-mini",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 100,
    store: true
  }
});

export const agenteEncerramento = new Agent({
  name: "Agente de Encerramento",
  instructions: "Encerre a conversa, se despeça do usuário e diga que se caso ele precise de uma nova ajuda, entre em contato novamente",
  model: "gpt-4.1-mini",
  modelSettings: {
    temperature: 0.1,
    topP: 1,
    maxTokens: 20,
    store: true
  }
});