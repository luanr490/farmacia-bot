import { db } from '../db.js';
import { canal } from '../canais/canal.js';
import type { Cliente, Etapa, Mensagem } from '../tipos.js';

export function obterOuCriarCliente(telefone: string): Cliente {
  const existente = db.prepare('SELECT * FROM clientes WHERE telefone = ?').get(telefone) as Cliente | undefined;
  if (existente) return existente;
  const { lastInsertRowid } = db.prepare('INSERT INTO clientes (telefone) VALUES (?)').run(telefone);
  return db.prepare('SELECT * FROM clientes WHERE id = ?').get(lastInsertRowid) as Cliente;
}

export function obterCliente(id: number): Cliente | undefined {
  return db.prepare('SELECT * FROM clientes WHERE id = ?').get(id) as Cliente | undefined;
}

export function definirEtapa(clienteId: number, etapa: Etapa) {
  db.prepare('UPDATE clientes SET etapa = ? WHERE id = ?').run(etapa, clienteId);
}

export function definirNome(clienteId: number, nome: string) {
  db.prepare('UPDATE clientes SET nome = ? WHERE id = ?').run(nome, clienteId);
}

export function marcarAtendente(clienteId: number, precisa: boolean) {
  db.prepare('UPDATE clientes SET precisa_atendente = ? WHERE id = ?').run(precisa ? 1 : 0, clienteId);
}

export function clientesAguardandoAtendente(): Cliente[] {
  return db.prepare('SELECT * FROM clientes WHERE precisa_atendente = 1 ORDER BY id').all() as Cliente[];
}

export function registrarEntrada(clienteId: number, texto: string | null, arquivo: string | null) {
  db.prepare("INSERT INTO mensagens (cliente_id, direcao, texto, arquivo) VALUES (?, 'ENTRADA', ?, ?)")
    .run(clienteId, texto, arquivo);
}

/** Grava a mensagem de saída e a envia pelo canal ativo. */
export async function enviarMensagem(cliente: Cliente, texto: string) {
  db.prepare("INSERT INTO mensagens (cliente_id, direcao, texto) VALUES (?, 'SAIDA', ?)").run(cliente.id, texto);
  await canal().enviar(cliente.telefone, texto);
}

export function historico(clienteId: number): Mensagem[] {
  return db.prepare('SELECT * FROM mensagens WHERE cliente_id = ? ORDER BY id').all(clienteId) as Mensagem[];
}
