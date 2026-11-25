import type { Comprovante, ConfigBilheteria, EventoInfo, Pedido, Pessoa } from "./tipos.ts";
import type { Pagamento } from "./pagamento.ts";
import { DadosInvalidosErro, NaoEncontradoErro, PagamentoErro, type Evento } from "./dominio.ts";
import { calcularTotal, montarIngressos } from "./preco.ts";
import { direitoAMeia } from "./regras.ts";

function validarPessoa(pessoa: unknown): asserts pessoa is Pessoa {
  if (pessoa === null || typeof pessoa !== "object" || Array.isArray(pessoa)) {
    throw new DadosInvalidosErro("cada ingresso precisa ser uma pessoa");
  }

  const candidata = pessoa as Pessoa;
  if (typeof candidata.nome !== "string" || candidata.nome.trim() === "") {
    throw new DadosInvalidosErro("cada ingresso precisa de um nome");
  }
  if (!Number.isInteger(candidata.idade) || candidata.idade < 0) {
    throw new DadosInvalidosErro("a idade precisa ser um inteiro maior ou igual a zero");
  }
  if (typeof candidata.estudante !== "boolean" || typeof candidata.pcd !== "boolean") {
    throw new DadosInvalidosErro("estudante e pcd precisam ser verdadeiro ou falso");
  }
}

function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("tempo esgotado")), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export class Bilheteria {
  #eventos: Evento[];
  #pagar: Pagamento;
  #limitePagamentoMs: number;
  #proximoReservaId = 1;

  constructor(config: ConfigBilheteria) {
    this.#eventos = config.eventos;
    this.#pagar = config.pagar;
    this.#limitePagamentoMs = config.limitePagamentoMs;
  }

  listarEventos(): EventoInfo[] {
    return this.#eventos.map((evento) => evento.info());
  }

  async reservar(pedido: Pedido): Promise<Comprovante> {
    if (!Array.isArray(pedido?.ingressos) || pedido.ingressos.length === 0) {
      throw new DadosInvalidosErro("o pedido precisa ter ao menos um ingresso");
    }

    for (const pessoa of pedido.ingressos) validarPessoa(pessoa);

    const evento = this.#eventos.find((e) => e.id === pedido.eventoId);
    if (!evento) {
      throw new NaoEncontradoErro(`o evento ${pedido.eventoId} não existe`);
    }

    const poltronas = pedido.ingressos.map((pessoa) => pessoa.poltrona);
    evento.reservar(poltronas);

    const ingressos = montarIngressos(evento.preco, pedido.ingressos, direitoAMeia);
    const total = calcularTotal(ingressos);

    try {
      await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs);
    } catch {
      evento.liberar(poltronas);
      throw new PagamentoErro("o pagamento não foi aprovado");
    }

    const reservaId = this.#proximoReservaId++;
    return { reservaId, eventoId: evento.id, ingressos, total };
  }
}

export function criarBilheteria(config: ConfigBilheteria): Bilheteria {
  return new Bilheteria(config);
}