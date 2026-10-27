import { db } from '../db.js';
import { canal } from '../canais/canal.js';
import type { Conversa, Etapa, Mensagem } from '../tipos.js';

export function getOrCreateConversation(phone: string): Conversa {
  const existente = db.prepare('SELECT * FROM conversas WHERE telefone_whatsapp = ?').get(phone) as Conversa | undefined;
  if (existente) return existente;
  db.prepare('INSERT INTO conversas (telefone_whatsapp) VALUES (?)').run(phone);
  return db.prepare('SELECT * FROM conversas WHERE telefone_whatsapp = ?').get(phone) as Conversa;
}

export function setStage(phone: string, stage: Etapa) {
  db.prepare('UPDATE conversas SET etapa = ? WHERE telefone_whatsapp = ?').run(stage, phone);
}

export function linkCpf(phone: string, cpf: string) {
  db.prepare('UPDATE conversas SET cpf_vinculado = ? WHERE telefone_whatsapp = ?').run(cpf, phone);
}

export function setNeedsAgent(phone: string, needsAgent: boolean) {
  db.prepare('UPDATE conversas SET precisa_atendente = ? WHERE telefone_whatsapp = ?').run(needsAgent ? 1 : 0, phone);
}

export function conversationsWaitingForAgent(): Conversa[] {
  return db.prepare('SELECT * FROM conversas WHERE precisa_atendente = 1 ORDER BY telefone_whatsapp').all() as Conversa[];
}

export function logIncomingMessage(phone: string, text: string | null, file: string | null) {
  db.prepare("INSERT INTO mensagens (telefone_whatsapp, direcao, texto, arquivo) VALUES (?, 'ENTRADA', ?, ?)").run(phone, text, file);
}

export async function sendMessage(conversation: Conversa, text: string) {
  db.prepare("INSERT INTO mensagens (telefone_whatsapp, direcao, texto) VALUES (?, 'SAIDA', ?)").run(conversation.telefone_whatsapp, text);
  await canal().enviar(conversation.telefone_whatsapp, text);
}

export function getHistory(phone: string): Mensagem[] {
  return db.prepare('SELECT * FROM mensagens WHERE telefone_whatsapp = ? ORDER BY id').all(phone) as Mensagem[];
}