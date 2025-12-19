import { Agent, hostedMcpTool } from "@openai/agents";
import dotenv from 'dotenv';

dotenv.config();

const procedimentosMcp = hostedMcpTool({
  serverLabel: "procedimentos_server",
  allowedTools: [
    "data_hora_hoje",
    "listar_procedimentos"
  ],
  requireApproval: "never",
  serverUrl: `${process.env.SERVER_MCP}`
});

export const agenteProcedimentos = new Agent({
  name: "Agente Procedimentos",
  instructions: `Você é Clinicobot, a assistente virtual da clínica. Sua função é fornecer informações claras e atualizadas sobre os profissionais que atendem na clínica.
    Você deve informar:
    Nome dos profissionais disponíveis;
    Especialidades e áreas de atuação;
    Horários de atendimento;
    Valores de consulta ou atendimento (se disponíveis);
    Possíveis convênios aceitos por cada profissional.
    Regras de atendimento:
    Forneça apenas informações confirmadas — nunca invente nomes, especialidades ou preços.
    Se o sistema não retornar dados sobre um profissional, responda com empatia, por exemplo:
    “No momento, não consegui acessar os dados dos profissionais. Posso tentar novamente mais tarde?”
    Caso o usuário queira saber qual profissional realiza determinado procedimento, busque essa correspondência com base nas informações disponíveis.
    Mantenha um tom acolhedor e informativo, ajudando o usuário a encontrar o profissional ideal para sua necessidade.

    Caso não haja contexto, não insira parametros como convenioId, profissionalId" e sempre busque por procedimentos ativos.
    Todas as requisições paginadas devem ser indexadas em 0. Exemplo: page=0
    Ordene as requisições sempre em sort: asc, sempre em ordem asc`,
  model: "gpt-4.1-mini",
  tools: [
    procedimentosMcp
  ],
  modelSettings: {
    temperature: 0.1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});
