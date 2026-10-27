import { db } from '../db.js';
import { sendMessage, getOrCreateConversation } from '../servicos/conversas.js';
import { ROTULO_STATUS, TRANSICOES, type Pedido, type StatusPedido } from '../tipos.js';

export const brl = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export class ErroNegocio extends Error {}

export function obterPedido(id: number): Pedido | undefined {
  return db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id) as Pedido | undefined;
}

export function criarPedido(clienteCpf: string, telefoneWhatsapp: string, receitaArquivo: string, observacao: string | null): Pedido {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO pedidos (cliente_cpf, telefone_whatsapp, status, receita_arquivo, observacao) VALUES (?, ?, 'AGUARDANDO_ANALISE', ?, ?)")
    .run(clienteCpf, telefoneWhatsapp, receitaArquivo, observacao);
  return obterPedido(Number(lastInsertRowid))!;
}

export function listarPedidos(status?: string) {
  const sql = `
    SELECT p.*, c.nome AS cliente_nome, p.telefone_whatsapp AS cliente_telefone
      FROM pedidos p JOIN clientes c ON c.cpf = p.cliente_cpf
     ${status ? 'WHERE p.status = ?' : ''}
     ORDER BY p.id DESC`;
  return status ? db.prepare(sql).all(status) : db.prepare(sql).all();
}

export function pedidosAbertosDoCliente(clienteCpf: string): Pedido[] {
  return db
    .prepare("SELECT * FROM pedidos WHERE cliente_cpf = ? AND status NOT IN ('ENTREGUE', 'CANCELADO') ORDER BY id")
    .all(clienteCpf) as Pedido[];
}

export function orcamentoPendente(clienteCpf: string): Pedido | undefined {
  return db
    .prepare("SELECT * FROM pedidos WHERE cliente_cpf = ? AND status = 'ORCAMENTO_ENVIADO' ORDER BY id DESC LIMIT 1")
    .get(clienteCpf) as Pedido | undefined;
}

function mudarStatus(pedido: Pedido, novo: StatusPedido) {
  if (!TRANSICOES[pedido.status].includes(novo)) {
    throw new ErroNegocio(`Não é possível ir de "${ROTULO_STATUS[pedido.status]}" para "${ROTULO_STATUS[novo]}".`);
  }
  db.prepare("UPDATE pedidos SET status = ?, atualizado_em = datetime('now', 'localtime') WHERE id = ?").run(novo, pedido.id);
}

export interface DadosOrcamento {
  descricao: string;
  valor: number;
  prazoDias: number;
  controlado: boolean;
}

export async function enviarOrcamento(pedidoId: number, dados: DadosOrcamento) {
  const pedido = obterPedido(pedidoId);
  if (!pedido) throw new ErroNegocio('Pedido não encontrado.');
  if (!dados.descricao?.trim() || !(dados.valor > 0) || !(dados.prazoDias > 0)) {
    throw new ErroNegocio('Preencha descrição, valor e prazo.');
  }
  mudarStatus(pedido, 'ORCAMENTO_ENVIADO');
  db.prepare('UPDATE pedidos SET orcamento_descricao = ?, orcamento_valor = ?, prazo_dias = ?, controlado = ? WHERE id = ?')
    .run(dados.descricao.trim(), dados.valor, dados.prazoDias, dados.controlado ? 1 : 0, pedidoId);

  const conversa = getOrCreateConversation(pedido.telefone_whatsapp);
  let texto =
    `📋 *Orçamento do pedido #${pedido.id}*\n\n` +
    `${dados.descricao.trim()}\n\n` +
    `💰 Valor: *${brl(dados.valor)}*\n` +
    `⏱️ Prazo: ${dados.prazoDias} dia(s) útil(eis) após a aprovação`;
  if (dados.controlado) {
    texto += '\n\n⚠️ Esta fórmula contém substância controlada. A receita original precisa ser entregue na farmácia no momento da retirada.';
  }
  texto += '\n\nResponda *SIM* para aprovar ou *NÃO* para recusar.';
  await sendMessage(conversa, texto);
}

const AVISOS: Partial<Record<StatusPedido, (p: Pedido) => string>> = {
  EM_MANIPULACAO: (p) => `🧪 Seu pedido #${p.id} entrou em manipulação. Avisaremos quando estiver pronto!`,
  PRONTO: (p) => `✅ Seu pedido #${p.id} está pronto para retirada!`,
  ENTREGUE: (p) => `📦 Pedido #${p.id} entregue. Obrigado pela preferência! 💚`,
  CANCELADO: (p) => `Seu pedido #${p.id} foi cancelado. Se tiver dúvidas, digite *3* para falar com um atendente.`,
};

/** Mudança de status feita pelo painel da farmácia; avisa o cliente. */
export async function atualizarStatus(pedidoId: number, novo: StatusPedido) {
  const pedido = obterPedido(pedidoId);
  if (!pedido) throw new ErroNegocio('Pedido não encontrado.');
  mudarStatus(pedido, novo);
  const aviso = AVISOS[novo];
  if (aviso) await sendMessage(getOrCreateConversation(pedido.telefone_whatsapp)!, aviso(pedido));
}

/** Resposta do cliente ao orçamento (SIM/NÃO pelo WhatsApp). */
export function responderOrcamento(pedido: Pedido, aprovado: boolean) {
  mudarStatus(pedido, aprovado ? 'APROVADO' : 'CANCELADO');
}