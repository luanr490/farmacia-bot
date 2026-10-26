// Banco de dados SQLite: um único arquivo em data/farmacia.db, sem servidor para instalar.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const pastaDados = path.resolve('data');
fs.mkdirSync(pastaDados, { recursive: true });

export const db = new Database(path.join(pastaDados, 'farmacia.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    telefone           TEXT    NOT NULL UNIQUE,
    nome               TEXT,
    etapa              TEXT    NOT NULL DEFAULT 'INICIO',   -- em que ponto da conversa o cliente está
    precisa_atendente  INTEGER NOT NULL DEFAULT 0,
    criado_em          TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id          INTEGER NOT NULL REFERENCES clientes(id),
    status              TEXT    NOT NULL,
    receita_arquivo     TEXT,               -- nome do arquivo em uploads/
    observacao          TEXT,               -- texto que o cliente mandou junto com a receita
    orcamento_descricao TEXT,
    orcamento_valor     REAL,
    prazo_dias          INTEGER,
    controlado          INTEGER NOT NULL DEFAULT 0,  -- Portaria 344: exige receita física retida
    criado_em           TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    atualizado_em       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS mensagens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id  INTEGER NOT NULL REFERENCES clientes(id),
    direcao     TEXT    NOT NULL CHECK (direcao IN ('ENTRADA', 'SAIDA')),
    texto       TEXT,
    arquivo     TEXT,
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_pedidos_cliente   ON pedidos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_mensagens_cliente ON mensagens(cliente_id);
`);
