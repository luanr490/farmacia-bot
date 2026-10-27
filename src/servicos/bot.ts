// O "cérebro" do atendimento: recebe uma mensagem do cliente e decide o que responder.
// Máquina de estados: conversas.etapa guarda onde a conversa parou (por telefone).
// Quando a conversa já tem um CPF vinculado, buscamos os dados do cliente por ele.
import { validateCpf } from './validacoes.js';
import {
  getOrCreateConversation, setStage, linkCpf, setNeedsAgent, logIncomingMessage, sendMessage,
} from './conversas.js';
import { getClientByCpf, createClient } from './clientes.js';
import { criarPedido, orcamentoPendente, pedidosAbertosDoCliente, responderOrcamento, brl } from './pedidos.js';
import { ROTULO_STATUS, type Conversa, type Cliente } from '../tipos.js';

const NOME_FARMACIA = process.env.NOME_FARMACIA ?? 'Farmácia Manipulação';

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const SIM = new Set(['sim', 's', 'aprovo', 'aprovado', 'ok', 'pode fazer']);
const NAO = new Set(['nao', 'n', 'recuso', 'nao quero']);

const menu = (nome: string | null) =>
  `${nome ? `${nome.split(' ')[0]}, como` : 'Como'} posso ajudar?\n\n` +
  '1️⃣ Fazer um pedido (enviar receita)\n' +
  '2️⃣ Acompanhar meus pedidos\n' +
  '3️⃣ Falar com um atendente';

export interface MensagemRecebida {
  telefone: string;
  texto?: string | null;
  arquivo?: string | null; // nome do arquivo já salvo em uploads/
}

export async function processarMensagem({ telefone, texto = null, arquivo = null }: MensagemRecebida) {
  let conversa = getOrCreateConversation(telefone);
  logIncomingMessage(telefone, texto, arquivo);
  const t = normalizar(texto ?? '');

  const cliente: Cliente | undefined = conversa.cpf_vinculado ? getClientByCpf(conversa.cpf_vinculado) : undefined;

  // 1) Resposta a um orçamento tem prioridade sobre qualquer etapa.
  if (cliente) {
    const pendente = orcamentoPendente(cliente.cpf);
    if (pendente && !arquivo && (SIM.has(t) || NAO.has(t))) {
      const aprovado = SIM.has(t);
      responderOrcamento(pendente, aprovado);
      await sendMessage(
        conversa,
        aprovado
          ? `🎉 Pedido #${pendente.id} aprovado (${brl(pendente.orcamento_valor ?? 0)})! Já vamos iniciar a manipulação.`
          : `Tudo bem, o pedido #${pendente.id} foi cancelado. Se mudar de ideia, é só enviar a receita de novo.`,
      );
      return;
    }
  }

  // 2) Comandos que funcionam a qualquer momento (só se já identificado).
  if (['menu', 'oi', 'ola', 'inicio', '0'].includes(t) && cliente) {
    setStage(telefone, 'MENU');
    await sendMessage(conversa, menu(cliente.nome));
    return;
  }

  // 3) Fluxo normal, conforme a etapa.
  switch (conversa.etapa) {
    case 'INICIO':
      if (cliente) {
        setStage(telefone, 'MENU');
        await sendMessage(conversa, `Olá! 👋 Bem-vindo(a) de volta à *${NOME_FARMACIA}*.\n\n${menu(cliente.nome)}`);
      } else {
        setStage(telefone, 'AGUARDANDO_CPF');
        await sendMessage(conversa, `Olá! 👋 Sou o assistente virtual da *${NOME_FARMACIA}*.\n\nPara começar, qual é o seu CPF?`);
      }
      return;

    case 'AGUARDANDO_CPF': {
  const cpfDigitado = (texto ?? '').trim();
  if (!validateCpf(cpfDigitado)) {
    await sendMessage(conversa, '❌ CPF inválido. Pode conferir e digitar novamente?');
    return;
  }
  const cpfLimpo = cpfDigitado.replace(/\D/g, '');

  let clienteEncontrado = getClientByCpf(cpfLimpo);
  if (!clienteEncontrado) {
    // Cadastro completo ainda não existe (próximo passo do roteiro) — por ora, cria só com o CPF.
    clienteEncontrado = createClient(cpfLimpo);
  }
  linkCpf(telefone, cpfLimpo);

  setStage(telefone, 'MENU');
  await sendMessage(conversa, `CPF confirmado! ✅\n\n${menu(clienteEncontrado.nome)}`);
  return;
}

    case 'AGUARDANDO_RECEITA':
      if (!cliente) return;
      if (arquivo) return receberReceita(conversa, cliente, arquivo, texto);
      if (t === 'cancelar') {
        setStage(telefone, 'MENU');
        await sendMessage(conversa, `Ok, cancelado.\n\n${menu(cliente.nome)}`);
        return;
      }
      await sendMessage(conversa, '📸 Preciso da *foto da receita* para continuar. Se preferir desistir, digite *cancelar*.');
      return;

    case 'MENU':
    default:
      if (!cliente) {
        setStage(telefone, 'AGUARDANDO_CPF');
        await sendMessage(conversa, 'Pra continuar, preciso confirmar seu CPF. Qual é?');
        return;
      }
      if (arquivo) return receberReceita(conversa, cliente, arquivo, texto);

      if (t === '1') {
        setStage(telefone, 'AGUARDANDO_RECEITA');
        await sendMessage(
          conversa,
          '📸 Envie uma *foto nítida da receita*, com o nome do médico, CRM e a fórmula legíveis.\n\nSe quiser, escreva alguma observação junto com a foto.',
        );
        return;
      }
      if (t === '2') {
        const abertos = pedidosAbertosDoCliente(cliente.cpf);
        const lista = abertos.length
          ? abertos.map((p) => `• Pedido #${p.id}: *${ROTULO_STATUS[p.status]}*`).join('\n')
          : 'Você não tem pedidos em andamento.';
        await sendMessage(conversa, `${lista}\n\nDigite *menu* para voltar.`);
        return;
      }
      if (t === '3') {
        setNeedsAgent(telefone, true);
        await sendMessage(conversa, '👩‍⚕️ Certo! Um atendente vai falar com você em instantes.');
        return;
      }
      if (conversa.precisa_atendente) return; // conversa está com um humano; o bot fica quieto
      await sendMessage(conversa, `Desculpe, não entendi. 🤔\n\n${menu(cliente.nome)}`);
  }
}

async function receberReceita(conversa: Conversa, cliente: Cliente, arquivo: string, observacao: string | null) {
  const pedido = criarPedido(cliente.cpf, conversa.telefone_whatsapp, arquivo, observacao?.trim() || null);
  setStage(conversa.telefone_whatsapp, 'MENU');
  await sendMessage(
    conversa,
    `✅ Receita recebida! Seu pedido é o *#${pedido.id}*.\n\n` +
      'Nosso farmacêutico vai analisar e enviar o orçamento por aqui em breve.',
  );
}