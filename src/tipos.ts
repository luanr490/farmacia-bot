export type Etapa = 'INICIO' | 'AGUARDANDO_NOME' | 'MENU' | 'AGUARDANDO_RECEITA';

export const STATUS = [
  'AGUARDANDO_ANALISE',
  'ORCAMENTO_ENVIADO',
  'APROVADO',
  'EM_MANIPULACAO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO',
] as const;
export type StatusPedido = (typeof STATUS)[number];

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_ANALISE: 'Aguardando análise',
  ORCAMENTO_ENVIADO: 'Orçamento enviado',
  APROVADO: 'Aprovado',
  EM_MANIPULACAO: 'Em manipulação',
  PRONTO: 'Pronto para retirada',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

// Quais mudanças de status são permitidas (como um fluxo de documento no SAP).
export const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  AGUARDANDO_ANALISE: ['ORCAMENTO_ENVIADO', 'CANCELADO'],
  ORCAMENTO_ENVIADO: ['APROVADO', 'CANCELADO'],
  APROVADO: ['EM_MANIPULACAO', 'CANCELADO'],
  EM_MANIPULACAO: ['PRONTO'],
  PRONTO: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADO: [],
};

export interface Cliente {
  id: number;
  telefone: string;
  nome: string | null;
  etapa: Etapa;
  precisa_atendente: number;
  criado_em: string;
}

export interface Pedido {
  id: number;
  cliente_id: number;
  status: StatusPedido;
  receita_arquivo: string | null;
  observacao: string | null;
  orcamento_descricao: string | null;
  orcamento_valor: number | null;
  prazo_dias: number | null;
  controlado: number;
  criado_em: string;
  atualizado_em: string;
}

export interface Mensagem {
  id: number;
  cliente_id: number;
  direcao: 'ENTRADA' | 'SAIDA';
  texto: string | null;
  arquivo: string | null;
  criado_em: string;
}
