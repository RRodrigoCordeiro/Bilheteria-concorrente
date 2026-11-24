import type { EventoInfo } from "./tipos.ts";

export abstract class ErroDeNegocio extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = new.target.name;
    this.status = status;
  }
}

export class DadosInvalidosErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

export class NaoEncontradoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 404);
  }
}

export class PoltronaOcupadaErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 409);
  }
}

export class PagamentoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 502);
  }
}

export class Evento {
  readonly id: number;
  readonly nome: string;
  readonly preco: number;
  readonly capacidade: number;
  #vendidas = new Set<number>();

  constructor(id: number, nome: string, preco: number, capacidade: number) {
    if (typeof nome !== "string" || nome.trim() === "") {
      throw new DadosInvalidosErro("o evento precisa de um nome");
    }
    if (typeof preco !== "number" || !Number.isFinite(preco) || preco < 0) {
      throw new DadosInvalidosErro("o preço do evento precisa ser um número maior ou igual a zero");
    }
    if (!Number.isInteger(capacidade) || capacidade < 1) {
      throw new DadosInvalidosErro("a capacidade do evento precisa ser um inteiro a partir de 1");
    }

    this.id = id;
    this.nome = nome;
    this.preco = preco;
    this.capacidade = capacidade;
  }

  get disponivel(): number {
    return this.capacidade - this.#vendidas.size;
  }

  reservar(poltronas: number[]): void {
    if (!Array.isArray(poltronas) || poltronas.length === 0) {
      throw new DadosInvalidosErro("informe ao menos uma poltrona");
    }

    const invalida = poltronas.find((poltrona) => !this.#existe(poltrona));
    if (invalida !== undefined) {
      throw new DadosInvalidosErro(`a poltrona ${invalida} não existe neste evento`);
    }

    if (new Set(poltronas).size !== poltronas.length) {
      throw new DadosInvalidosErro("a mesma poltrona aparece mais de uma vez no pedido");
    }

    const ocupada = poltronas.find((poltrona) => this.#vendidas.has(poltrona));
    if (ocupada !== undefined) {
      throw new PoltronaOcupadaErro(`a poltrona ${ocupada} já foi vendida`);
    }

    for (const poltrona of poltronas) this.#vendidas.add(poltrona);
  }

  liberar(poltronas: number[]): void {
    const naoVendida = poltronas.find((poltrona) => !this.#vendidas.has(poltrona));
    if (naoVendida !== undefined) {
      throw new DadosInvalidosErro(`a poltrona ${naoVendida} não estava vendida`);
    }

    for (const poltrona of poltronas) this.#vendidas.delete(poltrona);
  }

  info(): EventoInfo {
    return {
      id: this.id,
      nome: this.nome,
      preco: this.preco,
      capacidade: this.capacidade,
      disponivel: this.disponivel,
    };
  }

  #existe(poltrona: number): boolean {
    return Number.isInteger(poltrona) && poltrona >= 1 && poltrona <= this.capacidade;
  }
}