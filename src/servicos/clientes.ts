import { db } from '../db.js';
import type { Cliente } from '../tipos.js';

export function getClientByCpf(cpf: string): Cliente | undefined {
   return db.prepare('SELECT * FROM clientes WHERE cpf = ?').get(cpf) as Cliente | undefined;
}

export function createClient(cpf: string): Cliente {
  db.prepare('INSERT INTO clientes (cpf) VALUES (?)').run(cpf);
  return getClientByCpf(cpf)!;
}
// The "create client" function (full registration) comes in the next roadmap step,
// once we have all the CAD_* registration fields collected.