import express from 'express';
import path from 'node:path';
import './db.js';
import { api, PASTA_UPLOADS } from './rotas/api.js';

const app = express();
const PORTA = Number(process.env.PORTA ?? 3000);

app.use(express.json());
app.use('/api', api);
app.use('/uploads', express.static(PASTA_UPLOADS));
app.use(express.static(path.resolve('public')));

app.listen(PORTA, () => {
  console.log(`\n💊 Farmácia Bot rodando!`);
  console.log(`   Painel da farmácia:   http://localhost:${PORTA}`);
  console.log(`   Simulador WhatsApp:   http://localhost:${PORTA}/simulador.html\n`);
});
