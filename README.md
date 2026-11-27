# Bilheteria concorrente

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo | Passo do enunciado |
| :--- | :--- |
| `src/tipos.ts` (pronto) | 1: os tipos |
| `src/regras.ts` | 2: meia-entrada |
| `src/preco.ts` | 3: preço (funcional) |
| `src/dominio.ts` | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts` | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:** 

### Integrantes

| Nome | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- |
| Rodrigo Cordeiro | RRodrigoCordeiro | Meia-entrada, preço, `Evento` e a venda concorrente |
| Gabriel Clemente | GabrielClemente05 | Validações do `Evento` e poltronas vendidas em `Set` |
| Paulo Mendez | Paulomdz | Servidor em `main.ts` |
| Duan Oliveira | duanoliveira | Preenchimento do `README.md` e ajustes na venda concorrente em `bilheteria.ts` |

### Decisões

1. **Concorrência.** Duas pessoas não ficam com a mesma poltrona porque `evento.reservar(poltronas)` roda antes do `await` e não espera nada no meio. No Node, um trecho sem `await` não é interrompido: a função confere se a poltrona existe, se não está repetida e se não foi vendida, e só então grava as vendidas. O `await` perigoso é o do pagamento, em `await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs)`. Se ele ficasse entre a pergunta "está livre?" e a marcação, o outro pedido entraria nesse intervalo e os dois comprariam o mesmo lugar. Se a operadora recusar ou estourar o tempo, `evento.liberar(poltronas)` devolve as poltronas e a venda lança `PagamentoErro`.

2. **OO.** O `Evento` esconde a lista de poltronas vendidas. Quem está fora só lê `disponivel` e `info()`. Atribuir `evento.disponivel = 999` não muda as poltronas, porque `disponivel` é um `get` sem `set`. O `reservar` é tudo ou nada porque ele confere a lista inteira antes de gravar: lista vazia, poltrona fora de 1 até a capacidade, poltrona repetida ou já vendida lançam erro e nenhuma poltrona daquele pedido é marcada. Os erros são uma hierarquia porque todos herdam de `ErroDeNegocio`, que guarda o `status` HTTP. Cada filha só passa a mensagem e o status fixo (400, 404, 409 ou 502). O servidor trata qualquer um com `instanceof ErroDeNegocio` e responde com `erro.status`.

3. **Funcional.** O `preco.ts` é puro: recebe dados, devolve um resultado novo e não altera a lista de entrada. `valorDoIngresso(100)` devolve uma função que, para `"inteira"`, retorna 100 e, para `"meia"`, retorna 50. `aplicarTaxa(0.1)` devolve uma função que soma 10%. `montarIngressos` usa `map` e `calcularTotal` usa `reduce`. Dá para testar sem servidor chamando as funções direto: Ana estudante na poltrona 4 e Beto na 5, com preço 100, viram meia de 50 e inteira de 100; `calcularTotal` desses dois ingressos dá 165.

4. **Se fosse em outro paradigma.** No `preco.ts`, em orientação a objetos o preço viraria método de um objeto `Ingresso` que guarda e altera o próprio valor. O cálculo deixaria de ser uma função que só devolve um número, e o teste teria que criar o objeto e cuidar para ele não mudar a entrada. Para essa parte ficaria pior: o preço não precisa de estado, e a função pura se testa com uma chamada.

5. **Concorrente × paralelo.** Os pedidos são concorrentes porque o Node executa o JavaScript numa linha só e um pedido só solta a vez no `await` do pagamento. Em vários núcleos ao mesmo tempo, duas execuções poderiam passar juntas pela conferência "a poltrona está livre?" e as duas gravariam a mesma poltrona. A marcação síncrona deixaria de bastar, e o `reservar` do `Evento` precisaria de uma trava de verdade em volta da conferência e da gravação.

### Resultados do bench

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | 207 | 86 | 100 | 14 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram: o bench mandou 200 pedidos ao mesmo tempo para o evento 1, que tem 100 poltronas, dois pedidos por poltrona. Cem pessoas perderam a disputa e receberam 409, sem serem cobradas. As outras 100 ficaram com a poltrona e foram até a operadora: 86 pagaram (201) e 14 tiveram a cobrança recusada (502), perto dos 10% de `taxaDeFalha`. Essas 14 poltronas voltaram para a venda, por isso `disponivel` ficou 14. A conta fecha: 86 + 100 + 14 = 200.
