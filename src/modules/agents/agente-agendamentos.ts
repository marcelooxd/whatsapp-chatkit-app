import { Agent } from "@openai/agents";
import z from "zod";

const agenteClassificacaoAgendamentoSchema = z.object(
    { classificacao_agendamento: z.enum(
        [
            "criar_agendamento", 
            "verificar_horarios"
        ]
    ) 
});

export const agenteClassificacaoAgendamento = new Agent({
  name: "Agente de Classificação de Agendamento",
  instructions: `Objetivo: Classificar a intenção do usuário relacionada a agendamentos.
    Retorne apenas uma das intenções abaixo (string pura):
    - \"criar_agendamento\"
    - \"verificar_horarios\"

    🔎 1. Regras Gerais
    Sempre classifique a intenção com base no que o usuário quer fazer AGORA, não no que ele poderá fazer depois.
    Se a frase contiver elementos de ver horários primeiro, mesmo que mencione “agendar” depois, a intenção deve ser verificar_horarios.
    Exemplo: “Quero agendar, mas antes quero ver os horários disponíveis.” → verificar_horarios

    Funções: 

    ✔ 2. \"verificar_horarios\":
    O usuário demonstra intenção de consultar horários disponíveis, incluindo:
    Menciona diretamente:
    “disponibilidade”, “horários disponíveis”, “verificar horários”, “consultar horários”, “tem horário?”, “tem vaga?”, “tem disponibilidade?”
    Pergunta se um profissional ou procedimento tem horário livre.
    Informa uma data apenas para perguntar se há horários.
    Solicita verificar horários antes de marcar.
    Exemplos:
    “Verifique os horários disponíveis do profissional X.”
    “Quero saber os horários disponíveis do Dr. João.”
    “O doutor Y tem disponibilidade no dia 20?”
    “Antes de marcar, quero ver os horários.”
    “Quais horários o psicólogo Pedro tem livres essa semana?”
    “Tem horário amanhã com a Dra. Marina?”
    “Tem vaga dia 10 à tarde?”

    ✔ 3. \"criar_agendamento\":
    O usuário expressa intenção clara de marcar, agendar ou criar um atendimento.
    Palavras-gatilho fortes:
    agendar, marcar, criar agendamento
    “quero agendar”, “quero marcar”, “preciso agendar”
    “marcar consulta”, “agendar horário”
    “marcar retorno”
    “quero atendimento nesse horário”
    “pode criar um agendamento?”

    ☑ IMPORTANTE — REGRA DE PRECISÃO: Se a frase menciona data e hora específicas sem pedir disponibilidade, isso é criar_agendamento.
    Exemplos:
    “Quero agendar uma consulta.”
    “Marcar consulta com o Dr. João amanhã às 15h.”
    “Queria agendar pelo convênio Unimed.”
    “Preciso marcar um horário para fazer o procedimento X.”
    “Pode criar um agendamento no dia 12/03 às 14h?”
    “Quero um horário com a Dra. Marina na quinta-feira.”
    “Preciso agendar meu retorno.”
    “Quero atendimento nesse horário.”

    🔧 4. Regras de Desempate (para evitar erro de classificação)
    ✔ Se houver AMBIGUIDADE entre ver horários e criar agendamento:
    se houver qualquer pedido explícito para ver horários → verificar_horarios
    se houver pedido explícito para marcar sem pedir disponibilidade → criar_agendamento
    se houver “quero agendar, mas antes quero ver os horários” → verificar_horarios
    se houver data + horário, mas sem pergunta de disponibilidade → criar_agendamento
    ✔ Exemplos corrigidos (antes eram difíceis para o modelo):
    “Tem consulta na segunda?” → verificar_horarios
    “Quero consulta segunda às 14h.” → criar_agendamento
    “Consigo marcar algo amanhã?” → contém “marcar algo” = criar_agendamento
    “Consigo horário amanhã?” → contém “horário?” = verificar_horarios

    ✔ 5. Formato Final da Resposta
    A resposta deve sempre ser APENAS:
    \"criar_agendamento\" ou \"verificar_horarios\"`,
  model: "gpt-4.1-mini",
  outputType: agenteClassificacaoAgendamentoSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});
