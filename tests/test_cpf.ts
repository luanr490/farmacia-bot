// teste-cpf.ts
import { validateCpf } from "../src/servicos/validacoes.js";

const casos: [string, boolean][] = [
  ["111.111.111-11", false],   // todos iguais → inválido
  ["123.456.789-00", false],   // DV errado de propósito
  ["529.982.247-25", true],    // CPF válido conhecido
  ["52998224725", true],       // mesmo CPF, sem formatação
  ["123", false],              // tamanho errado
];

let passou = 0;
for (const [cpf, esperado] of casos) {
  const resultado = validateCpf(cpf);
  const ok = resultado === esperado;
  console.log(`${ok ? "✅" : "❌"} ${cpf} → esperado ${esperado}, obteve ${resultado}`);
  if (ok) passou++;
}
console.log(`\n${passou}/${casos.length} testes passaram`);