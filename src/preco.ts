import type { Ingresso, Pessoa, TipoIngresso } from "./tipos.ts";

const TAXA_DE_SERVICO = 0.1;

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

export function valorDoIngresso(precoBase: number): (tipo: TipoIngresso) => number {
  return (tipo) => (tipo === "meia" ? arredondar(precoBase / 2) : precoBase);
}

export function aplicarTaxa(percentual: number): (valor: number) => number {
  return (valor) => arredondar(valor * (1 + percentual));
}

export function montarIngressos(
  precoBase: number,
  pessoas: readonly Pessoa[],
  temDireitoAMeia: (pessoa: Pessoa) => boolean,
): Ingresso[] {
  const valorPorTipo = valorDoIngresso(precoBase);
  return pessoas.map((pessoa) => {
    const tipo: TipoIngresso = temDireitoAMeia(pessoa) ? "meia" : "inteira";
    return { nome: pessoa.nome, poltrona: pessoa.poltrona, tipo, valor: valorPorTipo(tipo) };
  });
}

export function calcularTotal(ingressos: readonly Ingresso[]): number {
  const soma = ingressos.reduce((acumulado, ingresso) => acumulado + ingresso.valor, 0);
  return aplicarTaxa(TAXA_DE_SERVICO)(soma);
}