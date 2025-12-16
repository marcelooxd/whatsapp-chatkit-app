import { Agent } from "@openai/agents";
import z from "zod";

const agentePacienteNaoEncontradoSchema = z.object({ classificacao: z.enum(["criar_paciente", "buscar_paciente"]) });

export const agentePacienteNaoEncontrado = new Agent({
  name: "Agente Paciente Não encontrado",
  instructions: `Agente de classificação: paciente_nao_encontrado

    Função:
    Classificar a intenção apropriada quando o paciente ainda não foi identificado no sistema em \"criar_paciente\" e \"buscar_paciente\", abaixo está a classificação de intenção e cada uma das opções.

    Intenções possíveis:

    1. buscar_paciente
    - Deve ser acionada na primeira tentativa de identificar o paciente.
    - Solicite o CPF e o Telefone registrado na clinica para o usuário, ambos os campos são obrigatórios para a busca de paciente.
    - O agente deve utilizar os parâmetros já fornecidos no contexto, CPF e telefone para tentar localizar o paciente existente.
    - Caso a busca não encontre nenhum registro correspondente, a intenção pode evoluir para \"criar_paciente\".

    2. criar_paciente
    - Deve ser acionada somente quando a busca não encontrar o paciente.
    - Responsável por criar um novo registro de paciente no sistema.
    - Campos obrigatórios: nome, CPF, telefone e e-mail.

    Regras:
    - Sempre tentar **buscar_paciente** antes de **criar_paciente**.
    - Caso falte algum dado essencial para a criação, o agente deve solicitar as informações ao usuário antes de prosseguir.

    `,
  model: "gpt-4.1",
  outputType: agentePacienteNaoEncontradoSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});
