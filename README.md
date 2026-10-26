# 💊 Farmácia Bot

Sistema de pedidos para farmácia de manipulação com atendimento via WhatsApp. Projeto de estudo.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) 20 ou superior (`node -v` para conferir).

```bash
npm install     # só na primeira vez
npm run dev     # sobe o servidor e reinicia sozinho quando você altera o código
```

Depois abra:

- **Painel da farmácia:** http://localhost:3000
- **Simulador de WhatsApp:** http://localhost:3000/simulador.html

Deixe os dois abertos lado a lado: o cliente fala pelo simulador e a farmácia responde pelo painel.

## Fluxo de um pedido

```
Cliente manda "oi" ──► bot pede o nome ──► menu (1 pedido · 2 acompanhar · 3 atendente)
        │
        ▼ envia foto da receita
AGUARDANDO_ANALISE ──(painel: farmacêutico envia orçamento)──► ORCAMENTO_ENVIADO
        │                                                        │
        │                                     cliente responde SIM / NÃO
        ▼                                                        ▼
    CANCELADO ◄──────────────────────────── NÃO          SIM ──► APROVADO
                                                                 │ (painel)
                                              EM_MANIPULACAO ◄───┘
                                                    │ (painel)
                                                  PRONTO ──► ENTREGUE
```

Cada mudança de status feita no painel gera uma mensagem automática para o cliente.
As transições permitidas ficam em `src/tipos.ts` (`TRANSICOES`), e o sistema recusa qualquer salto fora dessa lista.

## Estrutura

```
src/
  server.ts            sobe o Express e serve as telas
  db.ts                cria as tabelas SQLite (arquivo data/farmacia.db)
  tipos.ts             status, transições e tipos
  canais/canal.ts      por onde a mensagem sai (hoje: simulador; amanhã: WhatsApp)
  servicos/bot.ts      conversa com o cliente (máquina de estados por etapa)
  servicos/pedidos.ts  regras do pedido: orçamento, status, avisos
  servicos/clientes.ts clientes e histórico de mensagens
  rotas/api.ts         endpoints REST usados pelas telas
public/
  index.html           painel da farmácia
  simulador.html       celular fake com WhatsApp
uploads/               fotos das receitas (criada automaticamente)
data/                  banco SQLite (criada automaticamente)
```

Para zerar tudo e começar do zero, pare o servidor e apague as pastas `data/` e `uploads/`.

Para ver/editar o banco, use o [DB Browser for SQLite](https://sqlitebrowser.org) abrindo `data/farmacia.db`.

## Configuração opcional

| Variável        | Padrão                 | Para quê                  |
|-----------------|------------------------|---------------------------|
| `PORTA`         | 3000                   | porta do servidor         |
| `NOME_FARMACIA` | Farmácia Manipulação   | nome usado nas mensagens  |

Exemplo: `NOME_FARMACIA="Farmácia Vida" npm run dev`

## Próximos passos (ideias)

- [ ] Conectar o WhatsApp de verdade (Evolution API para testar, Cloud API da Meta para produção): basta criar um novo `Canal` em `src/canais/` e uma rota de webhook que chame `processarMensagem`.
- [ ] Login no painel (farmacêutico × atendente)
- [ ] Cadastro de fórmulas e tabela de preços para montar orçamento mais rápido
- [ ] Entrega × retirada, com endereço
- [ ] Ler a receita com IA e sugerir o orçamento
- [ ] LGPD: consentimento no primeiro contato e política de retenção das imagens de receita

> ⚠️ Receitas são dados de saúde (dado sensível na LGPD). Para uso real, será preciso controle de acesso, backup e cuidado com onde as imagens ficam guardadas.
