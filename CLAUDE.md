# Farmácia Bot — contexto para o Claude

## Quem sou e como quero trabalhar
- Sou o Luan, desenvolvedor SAP (ABAP, RAP, CDS, Fiori, CAP/BTP). Este é um projeto de **hobby e estudo** em Node/TypeScript; talvez um dia vire algo real para uma farmácia.
- **Quero aprender fazendo.** Não crie nem altere os arquivos do projeto por conta própria: explique o conceito, me diga o que fazer, passe esqueletos com `TODO` e um jeito de testar. Eu escrevo o código.
- Se eu travar, me ajude a achar o problema com dicas antes de entregar a resposta.
- Analogias com o mundo SAP/ABAP me ajudam muito (ex.: módulo TS ≈ grupo de funções; interface `Canal` ≈ BAdI).
- Respostas em português.

## O que é o sistema
Sistema de pedidos para farmácia de manipulação com atendimento via WhatsApp:
cliente manda a receita pelo WhatsApp → farmacêutico analisa no painel e envia orçamento → cliente aprova (SIM/NÃO) → status avança (manipulação → pronto → entregue), cada mudança gera aviso automático ao cliente.

## Stack e decisões
- Node.js 20+, TypeScript, Express 5, rodando com `tsx` (`npm run dev`).
- Banco **SQLite** (`better-sqlite3`), arquivo `data/farmacia.db`. Sem Docker.
- Front simples em HTML/JS puro (`public/`), sem framework.
- WhatsApp por enquanto é um **simulador** (`/simulador.html`). O WhatsApp real (Evolution API para testes, Cloud API da Meta para produção) entra depois, implementando a interface `Canal` em `src/canais/canal.ts` + uma rota de webhook que chama `processarMensagem`.
- Bot = máquina de estados escrita à mão (coluna `etapa`), sem IA por enquanto.

## Estrutura atual (versão 1, funcionando)
```
src/server.ts            Express + arquivos estáticos
src/db.ts                criação das tabelas
src/tipos.ts             status, TRANSICOES permitidas, tipos
src/canais/canal.ts      interface Canal (simulador hoje)
src/servicos/bot.ts      conversa (etapas INICIO, AGUARDANDO_NOME, MENU, AGUARDANDO_RECEITA)
src/servicos/pedidos.ts  orçamento, status, avisos
src/servicos/clientes.ts clientes (hoje identificados pelo telefone) e mensagens
src/rotas/api.ts         endpoints REST
public/index.html        painel da farmácia
public/simulador.html    celular fake
```

## Em andamento: identificação por CPF + cadastro pelo WhatsApp
Requisitos que defini:
- Validar se o cliente existe pelo **CPF**; se não existir, fazer o cadastro pelo próprio WhatsApp.
- Campos: nome completo; número para contato e preferência (WhatsApp ou ligação); e-mail; endereço; cliente ou médico; se médico, CRM.
- **CPF como chave primária** da tabela de clientes.

Roteiro combinado (eu implemento, o Claude orienta):
1. Função que valida CPF (dígitos verificadores) em `src/servicos/validacoes.ts`, testada com `teste-cpf.ts` ← **parei aqui**
2. Modelo de dados: `clientes` com CPF como PK + tabela `conversas` (chave = telefone do WhatsApp, guarda etapa, rascunho do cadastro e o CPF vinculado). Motivo: o número de WhatsApp não é a pessoa; um mesmo número pode atender mais de um CPF (ex.: mãe e filho) e um CPF pode falar de números diferentes. Pedidos passam a ter `cliente_cpf` e `telefone_whatsapp`.
3. Bot pedindo e verificando o CPF (etapa `AGUARDANDO_CPF`)
4. Cadastro pergunta por pergunta (etapas `CAD_*`, rascunho em JSON)
5. Confirmação com resumo e correção de um campo específico
6. Painel mostrando os dados do cliente (CPF, CRM, contato, e-mail, endereço)

## Gabarito
Existe uma implementação completa e testada do cadastro por CPF em `~/Documents/farmacia-bot-gabarito/`.
**Só consulte ou mostre trechos dela se eu pedir**, ou para comparar depois que eu terminar um passo.
