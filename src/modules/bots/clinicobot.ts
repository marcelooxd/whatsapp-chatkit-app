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
import { agenteClassificacaoAgendamento } from "../agents/agente-agendamentos";
import { agenteClassificaoInicialDeInfoDaClinica } from "../agents/agente-classificacao-info-inicial";
import { agenteBuscarPaciente } from "../agents/agente-busca-paciente";
import { agentePacienteNaoEncontrado } from "../agents/agente-paciente-naoencontrado";
import { agenteVerificaHorarios } from "../agents/agente-verifica-horarios";
import { agenteDeCriacaoDeAgendamentos } from "../agents/agente-criacao-agendamento";
import { sendMessageToOpenAI, limitConversationHistory, ConversationMessage } from "../../openai/openai-simple";

dotenv.config();

const conversationHistory = new Map<string, ConversationMessage[]>();

export async function processarMensagem(phone: string, text: string): Promise<string> {
  try {
    console.log(`📩 Mensagem recebida de ${phone}: ${text}`);
    
    let history = conversationHistory.get(phone) || [];
    history = limitConversationHistory(history, 20);
    history.push({ role: "user", content: text });
    
    const response = await sendMessageToOpenAI(text);
    if (!response.success) {
        console.error("❌ Erro OpenAI:", response.error);
        return "Desculpe, ocorreu um erro ao processar sua mensagem.";
    }

    const respostaGerada = response.text;

    history.push({ role: "assistant", content: respostaGerada });
    conversationHistory.set(phone, history);

    console.log(`🤖 Resposta gerada: ${respostaGerada}`);

    return respostaGerada;

  } catch (err) {
      console.error("❌ Erro no processamento:", err);
      return "Ocorreu um erro interno. Tente novamente mais tarde.";
  }
}

export type WorkflowInput = { input_as_text: string };

export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Atendimento de Paciente", async () => {
    
    let finalOutput: { output_text: string } = { output_text: "" };
    
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
      const resultTemp = await runner.run(naoIdentificado, [...conversationHistory]);
      conversationHistory.push(...resultTemp.newItems.map((i) => i.rawItem));

      finalOutput = { output_text: resultTemp.finalOutput ?? "" };

    } else {
      const segResultTemp = await runner.run(agenteSeguranca, [...conversationHistory]);
      conversationHistory.push(...segResultTemp.newItems.map((i) => i.rawItem));

      if (!segResultTemp.finalOutput) throw new Error("Agent result is undefined");

      const parsedSeg = segResultTemp.finalOutput;

      // CONTEXTO
      if (parsedSeg.contexto === "contexto") {

        const identTemp = await runner.run(agenteDeIdentificacao, [...conversationHistory]);
        conversationHistory.push(...identTemp.newItems.map((i) => i.rawItem));

        const parsedIdent = identTemp.finalOutput;

        // ATENDIMENTO INICIAL -> identifica a intenção do usuário
        if (parsedIdent?.classificacao === "atendimento_inicial") {
          const temp = await runner.run(agenteAtendimentoInicial, [...conversationHistory]);
          conversationHistory.push(...temp.newItems.map((i) => i.rawItem));

          finalOutput = { output_text: temp.finalOutput ?? "" };
        } else if (parsedIdent?.classificacao === "classificacao_info_clinica") {
          // CLASSIFICAÇÃO CLÍNICA -> 1 passo

          const tempClinica = await runner.run(agenteClassificaoInicialDeInfoDaClinica, [...conversationHistory]);
          conversationHistory.push(...tempClinica.newItems.map((i) => i.rawItem));

          const parsedClinica = tempClinica.finalOutput;

          if (parsedClinica?.info_classificacao === "info_convenio") {
            const temp = await runner.run(agenteConvenios, [...conversationHistory]);
            conversationHistory.push(...temp.newItems.map((i) => i.rawItem));
            
            finalOutput = { output_text: temp.finalOutput ?? "" };
          } else if (parsedClinica?.info_classificacao === "info_profissional") {
            const temp = await runner.run(agenteProfissionais, [...conversationHistory]);
            conversationHistory.push(...temp.newItems.map((i) => i.rawItem));

            finalOutput = { output_text: temp.finalOutput ?? "" };

          } else if (parsedClinica?.info_classificacao === "info_procedimento") {
            const temp = await runner.run(agenteProcedimentos, [...conversationHistory]);
            conversationHistory.push(...temp.newItems.map((i) => i.rawItem));

            finalOutput = { output_text: temp.finalOutput ?? "" };
          } else {
            const temp = await runner.run(agenteInfoClinica, [...conversationHistory]);
            conversationHistory.push(...temp.newItems.map((i) => i.rawItem));

            finalOutput = { output_text: temp.finalOutput ?? "" };
          }

          // AGENDAMENTO
        } else if (parsedIdent?.classificacao === "info_agendamento") {

          const temp = await runner.run(agenteClassificacaoAgendamentos, [...conversationHistory]);
          conversationHistory.push(...temp.newItems.map((i) => i.rawItem));

          const parsedAg = temp.finalOutput;

          if (parsedAg?.classificacao_paciente === "is_paciente") {

            const agTemp = await runner.run(agenteClassificacaoAgendamento, [...conversationHistory]);
            conversationHistory.push(...agTemp.newItems.map((i) => i.rawItem));

            const parsedAgTemp = agTemp.finalOutput;

            if (parsedAgTemp?.classificacao_agendamento === "verificar_horarios") {
              const horariosTemp = await runner.run(agenteVerificaHorarios, [...conversationHistory]);
              conversationHistory.push(...horariosTemp.newItems.map((i) => i.rawItem));
              finalOutput = { output_text: horariosTemp.finalOutput ?? "" };
            } else {
              const criarTemp = await runner.run(agenteDeCriacaoDeAgendamentos, [...conversationHistory]);
              conversationHistory.push(...criarTemp.newItems.map((i) => i.rawItem));

              finalOutput = { output_text: criarTemp.finalOutput ?? "" };
            }

          } 
          
          else if (parsedAg?.classificacao_paciente === "not_paciente") {
            const temp2 = await runner.run(agentePacienteNaoEncontrado, [...conversationHistory]);
            conversationHistory.push(...temp2.newItems.map((i) => i.rawItem));

            const parsedNP = temp2.finalOutput;

            if (parsedNP?.classificacao === "criar_paciente") {
              const temp3 = await runner.run(criacaoDePaciente, [...conversationHistory]);
              conversationHistory.push(...temp3.newItems.map((i) => i.rawItem));

              finalOutput = { output_text: temp3.finalOutput ?? "" };
            }

            else if (parsedNP?.classificacao === "buscar_paciente") {
              const temp4 = await runner.run(agenteBuscarPaciente, [...conversationHistory]);
              conversationHistory.push(...temp4.newItems.map((i) => i.rawItem));

              finalOutput = { output_text: temp4.finalOutput ?? "" };
            }

          }
        } else {
          // ENCERRAMENTO
          const encTemp = await runner.run(agenteEncerramento, [...conversationHistory]);
          conversationHistory.push(...encTemp.newItems.map((i) => i.rawItem));

          finalOutput = { output_text: encTemp.finalOutput ?? "" };
        }

      } else {
        const foraTemp = await runner.run(agenteForaContexto, [...conversationHistory]);
        conversationHistory.push(...foraTemp.newItems.map((i) => i.rawItem));
        finalOutput = { output_text: foraTemp.finalOutput ?? "" };
      }

    }

    return finalOutput;
  });
};