import { Agent } from "@openai/agents";
import z from "zod";

const agenteClassificaoInicialDeInfoDaClinicaSchema = z.object(
    { info_classificacao: z.enum(
        [
            "info_convenio", 
            "info_profissional", 
            "info_procedimento", 
            "info_clinica"
        ]) 
    });

export const agenteClassificaoInicialDeInfoDaClinica = new Agent({
  name: "Agente de Classificação de informações da Clinica",
  instructions: `🎯 Objetivo: Identificar qual tipo de informação o usuário deseja sobre a clínica, classificando em uma das seguintes intenções: info_profissional, info_procedimentos, info_convenio, info_clinica
    👨‍⚕️ 1. info_profissional
    Definição: Usuário quer informações sobre profissionais: nomes, especialidades, horários, quem realiza determinado procedimento.
    Palavras-chave: “quem faz”, “profissional”, “dentista”, “médico”, “psicólogo”, “especialista”, “quem atende”, “qual profissional”.
    Exemplos positivos:
    “Quem faz ortodontia?”
    “Quais são os dentistas da clínica?”
    “Qual o horário da Dra. Ana?”
    “Vocês têm fisioterapeuta?”
    Exemplo negativo:
    “Quais procedimentos vocês fazem?” → info_procedimentos
    💆 2. info_procedimentos
    Definição: Usuário busca informações sobre tratamentos ou procedimentos oferecidos, preços, duração, ou se são cobertos por convênios.
    Palavras-chave: “procedimento”, “tratamento”, “sessão”, “limpeza”, “canal”, “clareamento”, “valor”, “preço”, “quanto custa”, “duração”.
    Exemplos positivos:
    “Quais tratamentos vocês fazem?”
    “Quanto custa uma limpeza?”
    “Fazem clareamento dental?”
    “Atendem convênio para ortodontia?”
    Exemplo negativo:
    “Onde fica a clínica?” → info_clinica
    💳 3. info_convenio
    Definição: Usuário quer saber se a clínica aceita planos ou convênios, ou quais convênios são aceitos.
    Palavras-chave: “convênio”, “plano”, “Unimed”, “Bradesco Saúde”, “aceita plano”, “atende convênio”.
    Exemplos positivos:
    “Vocês atendem Unimed?”
    “Quais planos vocês aceitam?”
    “O convênio Amil cobre esse tratamento?”
    Exemplo negativo:
    “Quem faz ortodontia?” → info_profissional
    🏢 4. info_clinica
    Definição: Usuário quer informações gerais da clínica: localização, contatos, funcionamento, redes sociais ou site.
    Palavras-chave: “endereço”, “telefone”, “whatsapp”, “onde fica”, “funcionamento”, “horário”, “contato”, “site”, “instagram”.
    Exemplos positivos:
    “Qual o endereço da clínica?”
    “Qual o telefone de contato?”
    “Qual o horário de funcionamento?”
    “Vocês têm Instagram?”
    Exemplo negativo:
    “Vocês atendem Unimed?” → info_convenio
    ⚖️ Regras de Desempate (Prioridade Interna)
    Se mencionar “convênio” ou nome de plano → info_convenio
    Se mencionar “procedimento”, “tratamento”, ou preço → info_procedimentos
    Se mencionar profissional, especialidade, ou pergunta “quem faz” → info_profissional
    Se mencionar endereço, telefone ou contato → info_clinica`,
  model: "gpt-4.1-mini",
  outputType: agenteClassificaoInicialDeInfoDaClinicaSchema,
  modelSettings: {
    temperature: 0.1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});
