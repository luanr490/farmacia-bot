// O "cérebro" do atendimento: recebe uma mensagem do cliente e decide o que responder.
// É uma máquina de estados simples: a coluna clientes.etapa guarda onde a conversa parou.
import {
  definirEtapa, definirNome, enviarMensagem, marcarAtendente, obterCliente, obterOuCriarCliente, registrarEntrada,
} from './clientes.js';
import { criarPedido, orcamentoPendente, pedidosAbertosDoCliente, responderOrcamento, brl } from './pedidos.js';
import { ROTULO_STATUS, type Cliente } from '../tipos.js';

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
  let cliente = obterOuCriarCliente(telefone);
  registrarEntrada(cliente.id, texto, arquivo);
  const t = normalizar(texto ?? '');

  // 1) Resposta a um orçamento tem prioridade sobre qualquer etapa.
  const pendente = orcamentoPendente(cliente.id);
  if (pendente && !arquivo && (SIM.has(t) || NAO.has(t))) {
    const aprovado = SIM.has(t);
    responderOrcamento(pendente, aprovado);
    await enviarMensagem(
      cliente,
      aprovado
        ? `🎉 Pedido #${pendente.id} aprovado (${brl(pendente.orcamento_valor ?? 0)})! Já vamos iniciar a manipulação.`
        : `Tudo bem, o pedido #${pendente.id} foi cancelado. Se mudar de ideia, é só enviar a receita de novo.`,
    );
    return;
  }

  // 2) Comandos que funcionam a qualquer momento.
  if (['menu', 'oi', 'ola', 'inicio', '0'].includes(t) && cliente.nome) {
    definirEtapa(cliente.id, 'MENU');
    await enviarMensagem(cliente, menu(cliente.nome));
    return;
  }

  // 3) Fluxo normal, conforme a etapa.
  switch (cliente.etapa) {
    case 'INICIO':
      if (cliente.nome) {
        definirEtapa(cliente.id, 'MENU');
        await enviarMensagem(cliente, `Olá! 👋 Bem-vindo(a) de volta à *${NOME_FARMACIA}*.\n\n${menu(cliente.nome)}`);
      } else {
        definirEtapa(cliente.id, 'AGUARDANDO_NOME');
        await enviarMensagem(cliente, `Olá! 👋 Sou o assistente virtual da *${NOME_FARMACIA}*.\n\nPara começar, qual é o seu nome?`);
      }
      return;

    case 'AGUARDANDO_NOME': {
      const nome = (texto ?? '').trim();
      if (nome.length < 2) {
        await enviarMensagem(cliente, 'Não entendi. Pode me dizer o seu nome?');
        return;
      }
      definirNome(cliente.id, nome);
      definirEtapa(cliente.id, 'MENU');
      cliente = obterCliente(cliente.id)!;
      await enviarMensagem(cliente, `Prazer, ${nome.split(' ')[0]}! 😊\n\n${menu(cliente.nome)}`);
      return;
    }

    case 'AGUARDANDO_RECEITA':
      if (arquivo) return receberReceita(cliente, arquivo, texto);
      if (t === 'cancelar') {
        definirEtapa(cliente.id, 'MENU');
        await enviarMensagem(cliente, `Ok, cancelado.\n\n${menu(cliente.nome)}`);
        return;
      }
      await enviarMensagem(cliente, '📸 Preciso da *foto da receita* para continuar. Se preferir desistir, digite *cancelar*.');
      return;

    case 'MENU':
    default:
      // Mandou a foto direto, sem escolher opção: aceitamos como pedido.
      if (arquivo) return receberReceita(cliente, arquivo, texto);

      if (t === '1') {
        definirEtapa(cliente.id, 'AGUARDANDO_RECEITA');
        await enviarMensagem(
          cliente,
          '📸 Envie uma *foto nítida da receita*, com o nome do médico, CRM e a fórmula legíveis.\n\nSe quiser, escreva alguma observação junto com a foto.',
        );
        return;
      }
      if (t === '2') {
        const abertos = pedidosAbertosDoCliente(cliente.id);
        const lista = abertos.length
          ? abertos.map((p) => `• Pedido #${p.id}: *${ROTULO_STATUS[p.status]}*`).join('\n')
          : 'Você não tem pedidos em andamento.';
        await enviarMensagem(cliente, `${lista}\n\nDigite *menu* para voltar.`);
        return;
      }
      if (t === '3') {
        marcarAtendente(cliente.id, true);
        await enviarMensagem(cliente, '👩‍⚕️ Certo! Um atendente vai falar com você em instantes.');
        return;
      }
      if (cliente.precisa_atendente) return; // conversa está com um humano; o bot fica quieto
      await enviarMensagem(cliente, `Desculpe, não entendi. 🤔\n\n${menu(cliente.nome)}`);
  }
}

async function receberReceita(cliente: Cliente, arquivo: string, observacao: string | null) {
  const pedido = criarPedido(cliente.id, arquivo, observacao?.trim() || null);
  definirEtapa(cliente.id, 'MENU');
  await enviarMensagem(
    cliente,
    `✅ Receita recebida! Seu pedido é o *#${pedido.id}*.\n\n` +
      'Nosso farmacêutico vai analisar e enviar o orçamento por aqui em breve.',
  );
}
