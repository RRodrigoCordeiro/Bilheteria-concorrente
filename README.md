# Bilheteria concorrente

Serviço HTTP que vende ingressos de vários eventos ao mesmo tempo. Dois pedidos não ficam com a mesma poltrona: a cadeira é reservada antes do pagamento e, se a cobrança falha ou passa do tempo, ela volta para a venda.

Projeto final de Paradigmas de Linguagens de Programação. O passo a passo original da disciplina está no `GUIA.md`.

## Requisitos

- Node.js 22 ou mais novo (`node -v`)
- npm

## Comandos

```bash
npm install
npm test            # correção automática: 16 pontos
npm run typecheck   # confere os tipos sem gerar arquivo
npm start           # serviço em http://localhost:3000
npm run bench       # em outro terminal, com o serviço no ar
```

O bench dispara 200 pedidos ao mesmo tempo no evento 1. Dá para mudar a quantidade e o evento:

```bash
npm run bench -- 500 2
```

O primeiro número é a quantidade de pedidos e o segundo é o `eventoId`. A URL padrão é `http://localhost:3000`. Para apontar para outro endereço: `URL=http://localhost:3000 npm run bench` no bash, ou `$env:URL="http://localhost:3000"; npm run bench` no PowerShell.

Cada pedido do bench escolhe a poltrona `(i % capacidade) + 1`. Com mais pedidos do que cadeiras, várias pessoas disputam a mesma poltrona. O evento 1 enche: para rodar de novo, pare o `npm start` com Ctrl+C e suba outra vez.

## Eventos

O `src/main.ts` sobe três eventos:

| id | Nome | Preço | Cadeiras |
| ---: | :--- | ---: | ---: |
| 1 | Show de Abertura | 150 | 100 |
| 2 | Peça de Teatro | 80 | 50 |
| 3 | Stand-up Comedy | 60 | 30 |

A operadora de pagamento é falsa, para o projeto rodar sem internet. Cada cobrança demora 80 ms e falha em cerca de 10% das vezes. A bilheteria espera no máximo 500 ms. Se passar disso, a venda é cancelada e as poltronas voltam.

## Regras de negócio

- Uma pessoa tem meia-entrada se for estudante, pessoa com deficiência ou tiver 60 anos ou mais. A meia é a metade do preço do evento, arredondada para centavos.
- Quem não tem direito paga a inteira.
- O total do pedido é a soma dos ingressos mais 10% de taxa de serviço, também arredondada para centavos.
- As poltronas vão de 1 até a capacidade do evento. Poltrona 0, poltrona acima da capacidade, número quebrado, lista vazia ou a mesma cadeira duas vezes no pedido são recusados.
- Um pedido reserva todas as cadeiras ou nenhuma. Se uma já foi vendida, as outras do mesmo pedido não ficam marcadas.
- O evento só é criado com nome preenchido, preço finito maior ou igual a zero e capacidade inteira a partir de 1.

Exemplo: Ana, estudante, no Show de Abertura (R$ 150). A meia vale R$ 75 e o total com a taxa fica R$ 82,50.

## API

### `GET /eventos`

Lista os eventos com as cadeiras ainda livres.

```bash
curl http://localhost:3000/eventos
```

```json
[
  { "id": 1, "nome": "Show de Abertura", "preco": 150, "capacidade": 100, "disponivel": 100 }
]
```

### `POST /reservas`

Compra um ou mais ingressos do mesmo evento, um por pessoa.

```bash
curl -X POST http://localhost:3000/reservas -H "Content-Type: application/json" \
  -d "{\"eventoId\":1,\"ingressos\":[{\"nome\":\"Ana\",\"idade\":20,\"estudante\":true,\"pcd\":false,\"poltrona\":7}]}"
```

Resposta `201`:

```json
{
  "reservaId": 1,
  "eventoId": 1,
  "ingressos": [
    { "nome": "Ana", "poltrona": 7, "tipo": "meia", "valor": 75 }
  ],
  "total": 82.5
}
```

O cabeçalho `Content-Type: application/json` é obrigatório. Sem ele o Express não lê o corpo.

### Erros

| Status | Quando |
| ---: | :--- |
| 400 | JSON inválido, pedido vazio, poltrona inexistente ou repetida no pedido |
| 404 | `eventoId` que não existe |
| 409 | Poltrona já vendida |
| 502 | Pagamento recusado ou tempo esgotado. As poltronas desse pedido voltam |
| 500 | Qualquer outro erro |

O corpo do erro é `{ "mensagem": "..." }`.

## Como a venda funciona

1. A bilheteria recusa pedido sem ingressos e evento que não existe.
2. O `Evento` marca as poltronas **antes** de qualquer `await`. No Node o JavaScript roda numa linha só, então essa parte termina inteira antes de outro pedido continuar. Duas pessoas não passam juntas pela checagem da mesma cadeira.
3. O preço é calculado em `preco.ts`, com a regra de meia de `regras.ts`.
4. Só então a operadora é chamada, com tempo limite.
5. Se a cobrança falha ou demora demais, `liberar` devolve as poltronas e a resposta é 502.
6. Se passa, a bilheteria devolve o comprovante com um `reservaId` novo.

O `await` perigoso seria esperar o pagamento antes de reservar. Os dois pedidos veriam a cadeira livre, os dois pagariam e os dois receberiam a mesma poltrona.

## Organização do código

| Arquivo | Papel |
| :--- | :--- |
| `src/tipos.ts` | Tipos do pedido, do ingresso, do comprovante e da configuração |
| `src/regras.ts` | Quem tem direito à meia-entrada |
| `src/preco.ts` | Preço puro: meia, taxa e total, sem servidor e sem estado |
| `src/dominio.ts` | `Evento` e a hierarquia de erros de negócio |
| `src/bilheteria.ts` | A venda: reserva, preço, pagamento e liberação |
| `src/pagamento.ts` | Operadora falsa. A correção usa o original |
| `src/servidor.ts` | Rotas HTTP. A correção usa o original |
| `src/main.ts` | Sobe os três eventos e escuta a porta 3000 |
| `src/bench.ts` | Abertura de vendas com muitos pedidos ao mesmo tempo |
| `testes/projeto.ts` | Correção automática |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`. A correção compara com os arquivos originais.

`preco.ts` não usa laço, `let`, `var` nem mutação. `valorDoIngresso` e `aplicarTaxa` devolvem funções. Dá para testar o preço importando o módulo, sem subir o servidor: o `npm test` já faz isso.

O `Evento` esconde o conjunto de poltronas vendidas. Quem está fora só vê `disponivel` e `info()`, e só muda o estado por `reservar` e `liberar`. Os erros (`DadosInvalidosErro`, `NaoEncontradoErro`, `PoltronaOcupadaErro`, `PagamentoErro`) herdam de `ErroDeNegocio` e cada um carrega o status HTTP. O servidor trata a hierarquia inteira num lugar só.

Se o `Evento` fosse funcional, cada reserva devolveria um evento novo em vez de alterar o atual. Isso deixa o histórico fácil de guardar, mas a venda concorrente ficaria pior: dois pedidos leriam o mesmo evento, cada um devolveria a sua cópia e um apagaria a venda do outro. A classe, com o conjunto escondido e a reserva síncrona, evita esse desencontro. Num programa de verdade com vários núcleos, a mesma ideia precisaria de um bloqueio em volta de `reservar` e `liberar`, porque duas linhas de execução poderiam ler o conjunto ao mesmo tempo.

## Preencham (avaliado no vídeo)

**Link do vídeo:**

### Integrantes

| Nome | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- |
| | | |

### Resultados do bench

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | | | | |

O que os números mostram:
