# Auditoria nacional de webcams de Portugal

Este diretório transforma a descoberta de webcams num processo finito, sequencial e auditável. O objetivo não é afirmar que existe uma lista pública perfeita; é demonstrar que **todo o território e todas as vias de descoberta definidas foram verificadas**, com evidência positiva ou negativa.

## Ficheiros

- `municipalities.csv`: registo mestre dos 308 municípios, numerados de 1 a 308 pela ordem de execução.
- `progress.json`: estrutura de estados, verificações obrigatórias e dados operacionais para automatização.
- `sources.json`: catálogo das fontes nacionais, agregadores e consultas obrigatórias.
- `evidence/`: um ficheiro por município, criado quando a pesquisa começa.

## Ordem de execução

A ordem é fixa:

1. Abrir `municipalities.csv`.
2. Escolher a primeira linha cujo estado seja `not_started`.
3. Mudar essa linha para `in_progress`.
4. Criar `evidence/<id>.json` usando o modelo abaixo.
5. Executar as 16 verificações obrigatórias pela ordem definida em `progress.json`.
6. Registar **cada consulta**, mesmo quando devolve zero resultados.
7. Para cada candidato, procurar duplicados antes de o adicionar.
8. Atualizar `checks_completed` após cada verificação com evidência.
9. Quando as 16 verificações estiverem concluídas, mudar para `review`.
10. Uma segunda revisão confirma evidências, URLs, coordenadas e duplicação.
11. Só então mudar para `complete` e avançar para a linha seguinte.

Nunca se inicia um município posterior enquanto o anterior estiver `in_progress`, salvo quando estiver `blocked` com motivo documentado. Assim, começa-se na linha 1, Águeda, e termina-se na linha 308, São Vicente, sem lacunas silenciosas.

## Estados

| Estado | Significado |
|---|---|
| `not_started` | Nenhuma pesquisa iniciada |
| `in_progress` | Pesquisa em curso |
| `review` | As 16 verificações terminaram; falta controlo de qualidade |
| `complete` | Pesquisa e controlo de qualidade concluídos |
| `blocked` | Existe um impedimento documentado |

`complete` não significa “foram encontradas webcams”. Pode significar “foram feitas todas as pesquisas obrigatórias e não foi encontrada nenhuma”.

## Verificações obrigatórias por município

1. Site oficial da Câmara Municipal.
2. Portal oficial de turismo local/regional.
3. Google.
4. Bing.
5. DuckDuckGo.
6. Agregadores especializados.
7. Praias, surf e zonas costeiras.
8. Portos, marinas e clubes náuticos.
9. Aeroportos e aeródromos.
10. Trânsito, estradas, ferrovia e transportes.
11. Natureza, serras, parques, barragens e miradouros.
12. Hotéis, resorts e alojamentos.
13. Golfe, desporto e estâncias.
14. Meteorologia, universidades e observatórios.
15. YouTube, redes sociais e transmissões públicas.
16. Descoberta técnica de iframe, HLS, MJPEG, snapshots e APIs.

Cada verificação deve guardar data e hora, consulta, URL consultado, resultado, número de candidatos, observações e identificador de quem verificou.

## Evidência mínima

Modelo para `evidence/<id>.json`:

```json
{
  "municipality_id": "pt-aveiro-agueda",
  "started_at": "YYYY-MM-DDTHH:MM:SSZ",
  "reviewer": "nome",
  "checks": [
    {
      "check_id": "official_municipality",
      "status": "done",
      "queries": ["site:cm-agueda.pt webcam"],
      "urls_checked": ["https://..."],
      "candidates_found": [],
      "notes": "Nenhuma webcam pública encontrada.",
      "checked_at": "YYYY-MM-DDTHH:MM:SSZ"
    }
  ]
}
```

Uma marcação sem consultas e URLs não conta como evidência.

## Regra de conclusão

Um município só pode passar para `review` quando:

- `checks_completed` é igual a `checks_total`;
- todas as verificações possuem evidência;
- todos os candidatos foram classificados como `new`, `duplicate`, `possible_duplicate`, `offline`, `not_public` ou `rejected`;
- todas as câmaras novas têm origem, coordenadas, método de acesso e data de validação;
- nenhum candidato ficou por analisar.

Só pode passar para `complete` depois de uma revisão independente ou de uma segunda passagem explícita.

## Regra anti-duplicação

Antes de adicionar uma câmara, comparar por esta ordem:

1. URL final do stream normalizada.
2. URL de iframe ou snapshot normalizada.
3. ID do fornecedor.
4. Coordenadas num raio de 75 metros.
5. Nome, direção visual e imagem atual.
6. Origem real do feed incorporado.

Se for a mesma câmara, não se cria novo registo. A nova página é acrescentada às fontes alternativas da câmara existente. Se houver dúvida, marca-se `possible_duplicate` e não se publica até revisão.

## Como medir o progresso

Percentagem territorial:

`municípios complete / 308 × 100`

Percentagem operacional:

`soma das verificações concluídas / (308 × 16) × 100`

As duas métricas são separadas. Um município parcialmente pesquisado aumenta a percentagem operacional, mas não a territorial.

## Referência territorial

A lista usa a CAOP2025. A Direção-Geral do Território mantém a Carta Administrativa Oficial de Portugal e disponibiliza os limites e relações administrativas oficiais. Quando surgir nova versão da CAOP, deve comparar-se a lista, preservar o histórico e registar qualquer município adicionado, removido ou renomeado.
