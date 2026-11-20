import { Evento } from "./dominio.ts";
import { criarBilheteria } from "./bilheteria.ts";
import { criarPagamentoFalso } from "./pagamento.ts";
import { criarServidor } from "./servidor.ts";

const PORTA = 3000;

const eventos = [
  new Evento(1, "Show de Abertura", 150, 100),
  new Evento(2, "Peça de Teatro", 80, 50),
  new Evento(3, "Stand-up Comedy", 60, 30),
];

const pagar = criarPagamentoFalso({ latenciaMs: 80, taxaDeFalha: 0.1 });

const bilheteria = criarBilheteria({ eventos, pagar, limitePagamentoMs: 500 });

criarServidor(bilheteria).listen(PORTA, () => {
  console.log(`Bilheteria no ar em http://localhost:${PORTA}`);
});