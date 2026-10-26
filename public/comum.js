// Funções compartilhadas entre o painel e o simulador.
export async function api(caminho, opcoes = {}) {
  const resp = await fetch(`/api${caminho}`, opcoes);
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || `Erro ${resp.status}`);
  return dados;
}

export const postJson = (caminho, corpo) =>
  api(caminho, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });

export const escapar = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Formatação estilo WhatsApp: *negrito* e _itálico_
export const formatarWhats = (t) =>
  escapar(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>');

export const hora = (dataSql) => (dataSql || '').slice(11, 16);

export function renderizarBalao(m) {
  const anexo = m.arquivo
    ? m.arquivo.endsWith('.pdf')
      ? `<a href="/uploads/${escapar(m.arquivo)}" target="_blank">📄 receita.pdf</a><br>`
      : `<a href="/uploads/${escapar(m.arquivo)}" target="_blank"><img src="/uploads/${escapar(m.arquivo)}" alt="anexo"></a>`
    : '';
  return `<div class="balao ${m.direcao}">${anexo}${formatarWhats(m.texto)}<span class="hora">${hora(m.criado_em)}</span></div>`;
}
