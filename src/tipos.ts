export type Etapa = 'INICIO' | 'AGUARDANDO_CPF' | 'AGUARDANDO_NOME' | 'MENU' | 'AGUARDANDO_RECEITA';
export type PreferenciaContato = 'whatsapp' | 'ligacao';
export type TipoCliente = 'cliente' | 'medico';

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
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone_contato: string | null;
  preferencia_contato: PreferenciaContato | null;
  endereco: string | null;
  tipo: TipoCliente | null;
  crm: string | null;
  criado_em: string;
}

export interface Conversa {
  telefone_whatsapp: string;
  etapa: Etapa;
  rascunho_cadastro: string | null;
  cpf_vinculado: string | null;
  precisa_atendente: number;
  atualizado_em: string;
}

export interface Pedido {
  id: number;
  cliente_cpf: string;
  telefone_whatsapp: string;
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
  telefone_whatsapp: string;
  direcao: 'ENTRADA' | 'SAIDA';
  texto: string | null;
  arquivo: string | null;
  criado_em: string;
}
