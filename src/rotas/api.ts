import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { processarMensagem } from '../servicos/bot.js';
import {
  clientesAguardandoAtendente, enviarMensagem, historico, marcarAtendente, obterCliente, obterOuCriarCliente,
} from '../servicos/clientes.js';
import { ErroNegocio, atualizarStatus, enviarOrcamento, listarPedidos, obterPedido } from '../servicos/pedidos.js';
import { ROTULO_STATUS, STATUS, TRANSICOES, type StatusPedido } from '../tipos.js';

export const PASTA_UPLOADS = path.resolve('uploads');
fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: PASTA_UPLOADS,
    filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname).toLowerCase() || '.jpg'}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf'),
});

export const api = Router();

api.get('/status', (_req, res) => {
  res.json(STATUS.map((s) => ({ codigo: s, rotulo: ROTULO_STATUS[s], proximos: TRANSICOES[s] })));
});

// ---------- Simulador de WhatsApp ----------
// Faz o papel do "webhook" que o WhatsApp chamaria quando o cliente manda mensagem.
api.post('/simulador/mensagem', upload.single('arquivo'), async (req, res) => {
  const telefone = String(req.body.telefone ?? '').replace(/\D/g, '');
  if (telefone.length < 10) return void res.status(400).json({ erro: 'Telefone inválido.' });
  const texto = req.body.texto ? String(req.body.texto) : null;
  if (!texto && !req.file) return void res.status(400).json({ erro: 'Mensagem vazia.' });
  await processarMensagem({ telefone, texto, arquivo: req.file?.filename ?? null });
  res.json({ ok: true });
});

api.get('/simulador/conversa/:telefone', (req, res) => {
  const cliente = obterOuCriarCliente(String(req.params.telefone).replace(/\D/g, ''));
  res.json(historico(cliente.id));
});

// ---------- Painel da farmácia ----------
api.get('/pedidos', (req, res) => {
  const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
  res.json(listarPedidos(status));
});

api.get('/pedidos/:id', (req, res) => {
  const pedido = obterPedido(Number(req.params.id));
  if (!pedido) return void res.status(404).json({ erro: 'Pedido não encontrado.' });
  const cliente = obterCliente(pedido.cliente_id)!;
  res.json({ pedido, cliente, mensagens: historico(cliente.id), proximos: TRANSICOES[pedido.status] });
});

api.post('/pedidos/:id/orcamento', async (req, res) => {
  const { descricao, valor, prazoDias, controlado } = req.body ?? {};
  await enviarOrcamento(Number(req.params.id), {
    descricao: String(descricao ?? ''),
    valor: Number(String(valor ?? '').replace(',', '.')),
    prazoDias: Number(prazoDias),
    controlado: Boolean(controlado),
  });
  res.json({ ok: true });
});

api.post('/pedidos/:id/status', async (req, res) => {
  const novo = req.body?.status as StatusPedido;
  if (!STATUS.includes(novo)) return void res.status(400).json({ erro: 'Status inválido.' });
  if (novo === 'ORCAMENTO_ENVIADO') return void res.status(400).json({ erro: 'Use o formulário de orçamento.' });
  await atualizarStatus(Number(req.params.id), novo);
  res.json({ ok: true });
});

api.get('/atendimento', (_req, res) => {
  res.json(clientesAguardandoAtendente());
});

// Atendente humano escrevendo direto para o cliente.
api.post('/clientes/:id/mensagem', async (req, res) => {
  const cliente = obterCliente(Number(req.params.id));
  const texto = String(req.body?.texto ?? '').trim();
  if (!cliente) return void res.status(404).json({ erro: 'Cliente não encontrado.' });
  if (!texto) return void res.status(400).json({ erro: 'Mensagem vazia.' });
  await enviarMensagem(cliente, texto);
  res.json({ ok: true });
});

api.post('/clientes/:id/encerrar-atendimento', (req, res) => {
  marcarAtendente(Number(req.params.id), false);
  res.json({ ok: true });
});

// Erros de regra de negócio viram 400 com mensagem amigável; o resto vira 500.
api.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (erro instanceof ErroNegocio) return void res.status(400).json({ erro: erro.message });
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno.' });
});
