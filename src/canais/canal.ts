// Um "canal" é por onde a mensagem sai de verdade.
// Hoje: simulador (as mensagens ficam só no banco e a tela do simulador lê de lá).
// Amanhã: WhatsApp Cloud API ou Evolution API, implementando esta mesma interface.
export interface Canal {
  nome: string;
  enviar(telefone: string, texto: string): Promise<void>;
}

export const canalSimulador: Canal = {
  nome: 'simulador',
  async enviar() {
    // Nada a fazer: a mensagem já foi gravada no banco e o simulador a exibe.
  },
};

let canalAtivo: Canal = canalSimulador;

export function definirCanal(canal: Canal) {
  canalAtivo = canal;
}

export function canal() {
  return canalAtivo;
}
