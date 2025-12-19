import dotenv from 'dotenv';

import { AgentInputItem, Runner, withTrace } from "@openai/agents";
import { jailbreakGuardrailsConfig, runAndApplyGuardrails } from "../guardrails/guardrails";
import { agenteProfissionais } from "../agents/agente-profissionais";
import { agenteInfoClinica } from "../agents/agente-infoclinica";
import { agenteProcedimentos } from "../agents/agente-procedimentos";
import { agenteDeIdentificacao } from "../agents/agente-identificacao";
import { agenteClassificacaoAgendamentos } from "../agents/agente-classificacao-agendamento";
import { agenteAtendimentoInicial } from "../agents/agente-atendimento-inicial";
import { agenteForaContexto, agenteSeguranca } from "../agents/agente-seguranca";
import { agenteEncerramento, naoIdentificado } from "../agents/agente-encerramento";
import { criacaoDePaciente } from "../agents/agente-new-paciente";
import { agenteConvenios } from "../agents/agente-convenios";
import { agenteDeAgendamento } from "../agents/agente-agendamentos";
import { agenteClassificaoInicialDeInfoDaClinica } from "../agents/agente-classificacao-info-inicial";
import { agenteBuscarPaciente } from "../agents/agente-busca-paciente";
import { agentePacienteNaoEncontrado } from "../agents/agente-paciente-naoencontrado";
import { agenteVerificaHorarios } from "../agents/agente-verifica-horarios";
import { agenteDeCriacaoDeAgendamentos } from "../agents/agente-criacao-agendamento";
import { sendMessageToOpenAI, ConversationMessage } from "../../openai/openai-execute";
import { criarAgendamentoOnline } from '../agents/agente-agendamento-online';
import { agenteListarAgendamentosPaciente } from '../agents/agente-lista-agendamentos';
import { agenteInfoAgendamentos } from '../agents/agente-info-agendamentos';

dotenv.config();

const conversationHistory = new Map<string, ConversationMessage[]>();

export type WorkflowInput = { 
  input_as_text: string,
  phone: string;
  history: ConversationMessage[];
  state: WorkflowState;
};

export type CriarAgendamentoState = {
  paciente: PacienteState | null;
  agendamento: AgendamentoState;
};

type AgendamentoState = {
  pacienteId: number | null;
  profissionalId: number | null;
  procedimentoId: number | null;
  convenioId: number | null;
  dataAgendamentoDas: string | null;
  dataAgendamentoAs: string | null;
  statusAgendamento: number;
  motivoConsulta?: string | null;
  online?: boolean | null;
};

type PacienteState = {
  id: number | null;
  nome: string | null;
  cpf: string | null;
  telefonePrincipal: string | null;
  ativo: boolean | null;
};

export type WorkflowState = {
  paciente: PacienteState | null;
};

const workflowState = new Map<string, WorkflowState>();

export async function processarMensagem(phone: string, text: string): Promise<string> {
  try {
    console.log(`📩 Mensagem recebida de ${phone}: ${text}`);
    let history = conversationHistory.get(phone);
    if (!history) {
      history = [];
      conversationHistory.set(phone, history);
    }
    history.push({ role: "user", content: text });
    
    let state = workflowState.get(phone);
    if (!state) {
      state = { paciente: null };
      workflowState.set(phone, state);
    }

    const response = await sendMessageToOpenAI(phone, text, history, state);
    
    if (!response.success) {
        console.error("❌ Erro OpenAI:", response.error);
        return "Desculpe, ocorreu um erro ao processar sua mensagem.";
    }
    history.push({ role: "assistant", content: response.text });

    return response.text;

  } catch (err) {
      console.error("❌ Erro no processamento:", err);
      return "Ocorreu um erro interno. Tente novamente mais tarde.";
  }
}

function toAgentInputItems(
  history: ConversationMessage[]
): AgentInputItem[] {
  console.log("history", history)
  return history
    .filter(msg => msg.role !== "assistant")
    .map(msg => {
      if (msg.role === "system") {
        return { role: "system", content: msg.content };
      }
      return { 
        role: "user", content: [{ type: "input_text", text: msg.content }]
      };
    });
}

export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Atendimento de Paciente", async () => {
    
    let finalOutput: { output_text: string } = { output_text: "" };

    // const conversationHistory: AgentInputItem[] = toAgentInputItems(workflow.history);
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: `${process.env.WORKFLOW_ID}`,
      }
    });

    const guardrailsInputText = workflow.input_as_text;

    const { hasTripwire: guardrailsHasTripwire, failOutput: guardrailsFailOutput, passOutput: guardrailsPassOutput  } = await runAndApplyGuardrails(
      guardrailsInputText,
      jailbreakGuardrailsConfig,
      conversationHistory,
      workflow
    );

    if (guardrailsHasTripwire) {
      const invalidInput = await runner.run(naoIdentificado, [...conversationHistory]);
      conversationHistory.push(...invalidInput.newItems.map((i) => i.rawItem));
      finalOutput = { output_text: "" + invalidInput.finalOutput };
    } else {
      const segResultTemp = await runner.run(agenteSeguranca, [...conversationHistory]);
      conversationHistory.push(...segResultTemp.newItems.map((i) => i.rawItem));

      if (!segResultTemp.finalOutput) throw new Error("Agent result is undefined");

      const parsedSeg = segResultTemp.finalOutput;
      console.log(parsedSeg);

      // CONTEXTO
      if (parsedSeg.contexto === "contexto") {
        const identTemp = await runner.run(agenteDeIdentificacao, [...conversationHistory]);
        conversationHistory.push(...identTemp.newItems.map((i) => i.rawItem));

        const parsedIdentificacao = identTemp.finalOutput;
        console.log(parsedIdentificacao);

        if (parsedIdentificacao?.classificacao === "info_agendamento") {

          const classificacaoAgendamento = await runner.run(agenteClassificacaoAgendamentos, [...conversationHistory]);
            conversationHistory.push(...classificacaoAgendamento.newItems.map((i) => i.rawItem));
          
          const parsedAgendamento = classificacaoAgendamento.finalOutput;
          console.log("parsedAgendamento:", parsedAgendamento);
          if (parsedAgendamento?.classificacao_agendamentos === "info_agendamentos") {
            const infoAgendamentos = await runner.run(agenteInfoAgendamentos, [...conversationHistory]);
            conversationHistory.push(...infoAgendamentos.newItems.map((i) => i.rawItem));
            finalOutput = { output_text: infoAgendamentos.finalOutput ?? ""  };

          } else if (parsedAgendamento?.classificacao_agendamentos === "buscar_paciente") {
            const buscarPacienteTemp = await runner.run(agenteBuscarPaciente, [...conversationHistory]);
            conversationHistory.push(...buscarPacienteTemp.newItems.map((i) => i.rawItem));
            finalOutput = { output_text: buscarPacienteTemp.finalOutput ?? ""  };

          } else if (parsedAgendamento?.classificacao_agendamentos === "verificar_horarios") {
            const verificarHorariosTemp = await runner.run(agenteVerificaHorarios, [...conversationHistory]);
            conversationHistory.push(...verificarHorariosTemp.newItems.map((i) => i.rawItem));
            finalOutput = { output_text: verificarHorariosTemp.finalOutput  ?? "" };
          
          } else if (parsedAgendamento?.classificacao_agendamentos === "criar_agendamento") {
            const criarAgendamentoTemp = await runner.run(agenteDeCriacaoDeAgendamentos, [...conversationHistory ]);
            conversationHistory.push(...criarAgendamentoTemp.newItems.map((i) => i.rawItem));
            finalOutput = { output_text: criarAgendamentoTemp.finalOutput ?? ""  };

          } else if (parsedAgendamento?.classificacao_agendamentos === "criar_agendamento_online") { 
            const criarAgendamentoOnlineTemp = await runner.run(criarAgendamentoOnline, [...conversationHistory]);
            conversationHistory.push(...criarAgendamentoOnlineTemp.newItems.map((i) => i.rawItem ));
            finalOutput = { output_text: criarAgendamentoOnlineTemp.finalOutput ?? ""};
          
          } else if (parsedAgendamento?.classificacao_agendamentos === "listar_agendamentos") { 
            const listarAgendamentosTemp = await runner.run(agenteListarAgendamentosPaciente, [...conversationHistory]);
            conversationHistory.push(...listarAgendamentosTemp.newItems.map((i) => i.rawItem ));
            finalOutput = { output_text: listarAgendamentosTemp.finalOutput ?? ""};
          
          } else if (parsedAgendamento?.classificacao_agendamentos === "cadastro_paciente") { 
            const criacaoDePacienteTemp = await runner.run(criacaoDePaciente, [...conversationHistory]);
            conversationHistory.push(...criacaoDePacienteTemp.newItems.map((i) => i.rawItem ));
            finalOutput = { output_text: criacaoDePacienteTemp.finalOutput ?? ""};
          }

        } else if (parsedIdentificacao?.classificacao === "classificacao_info_clinica") {

            const tempClinica = await runner.run(agenteClassificaoInicialDeInfoDaClinica, [...conversationHistory]);
            conversationHistory.push(...tempClinica.newItems.map((i) => i.rawItem));

            const parsedClinica = tempClinica.finalOutput;

            if (parsedClinica?.info_classificacao === "info_convenio") {
              const convenios = await runner.run(agenteConvenios, [...conversationHistory]);
              conversationHistory.push(...convenios.newItems.map((i) => i.rawItem));
              finalOutput = { output_text: convenios.finalOutput  ?? "" };

            } else if (parsedClinica?.info_classificacao === "info_profissional") {
              const profissionais = await runner.run(agenteProfissionais, [...conversationHistory]);
              conversationHistory.push(...profissionais.newItems.map((i) => i.rawItem));

              finalOutput = { output_text: profissionais.finalOutput ?? "" };

            } else if (parsedClinica?.info_classificacao === "info_procedimento") {
              const procedimentos = await runner.run(agenteProcedimentos, [...conversationHistory]);
              conversationHistory.push(...procedimentos.newItems.map((i) => i.rawItem));

              finalOutput = { output_text: procedimentos.finalOutput ?? "" };
            } else {
              const clinica = await runner.run(agenteInfoClinica, [...conversationHistory]);
              conversationHistory.push(...clinica.newItems.map((i) => i.rawItem));
              finalOutput = { output_text: clinica.finalOutput ?? "" };
            
            }

        } else if (parsedIdentificacao?.classificacao === "atendimento_inicial") {
         
          const temp = await runner.run(agenteAtendimentoInicial, [...conversationHistory]);
          conversationHistory.push(...temp.newItems.map((i) => i.rawItem));
          finalOutput = { output_text: temp.finalOutput ?? "" };
          
        } else {
          const encerramento = await runner.run(agenteEncerramento, [...conversationHistory]);
          conversationHistory.push(...encerramento.newItems.map((i) => i.rawItem));
          finalOutput = { output_text: encerramento.finalOutput ?? ""};

        }

      } else {
        const foraTemp = await runner.run(agenteForaContexto, [...conversationHistory]);
        conversationHistory.push(...foraTemp.newItems.map((i) => i.rawItem));
        finalOutput = { output_text: foraTemp.finalOutput ?? ""};
      }

    }
    
    return finalOutput;

  });
};