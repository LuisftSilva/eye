# Auditoria nacional de webcams de Portugal

Este diretório transforma a descoberta de webcams num processo finito, sequencial e auditável. O objetivo não é afirmar que existe uma lista pública perfeita; é demonstrar que **todo o território e todas as vias de descoberta definidas foram verificadas**, com evidência positiva ou negativa.

## Ficheiros

- `progress.json`: os 308 municípios da CAOP2025 e o respetivo estado.
- `sources.json`: catálogo das fontes nacionais, agregadores, motores e pesquisas obrigatórias.
- `evidence/`: um ficheiro por município, criado quando a pesquisa começa.
- `deduplication.md`: regra para decidir se duas referências correspondem à mesma câmara.

## Ordem de execução

A ordem é fixa:

1. Percorrer `progress.json` de cima para baixo.
2. Escolher o primeiro município com `status: "not_started"`.
3. Mudar para `in_progress`.
4. Criar `evidence/<id>.json` a partir do modelo abaixo.
5. Executar as 16 verificações obrigatórias pela ordem indicada em `required_checks`.
6. Registar **cada consulta**, mesmo quando devolve zero resultados.
7. Para cada candidato, procurar duplicados antes de o adicionar.
8. Quando as 16 verificações estiverem concluídas, mudar para `review`.
9. Uma segunda revisão confirma evidências, URLs, coordenadas e duplicação.
10. Só então mudar para `complete`.

Nunca se inicia um município posterior enquanto o anterior estiver `in_progress`, salvo quando estiver `blocked` com motivo documentado.

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

Cada verificação deve guardar:
- data e hora;
- consulta utilizada;
- URL consultado;
- resultado;
- número de candidatos;
- observações;
- identificador de quem verificou.

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

Uma caixa marcada sem consultas e URLs não conta como evidência.

## Regra de conclusão

Um município só pode passar para `review` quando:

- `checks_completed` é igual a `checks_total`;
- todas as verificações possuem evidência;
- todos os candidatos foram classificados como `new`, `duplicate`, `offline`, `not_public` ou `rejected`;
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
6. Origem do feed incorporado.

Se for a mesma câmara:
- não criar novo registo;
- adicionar a nova página à lista `sources`;
- preservar a fonte original e todas as fontes alternativas.

Se houver dúvida, marcar `possible_duplicate` e não publicar até revisão.

## Como medir o progresso

Percentagem territorial:

`municípios complete / 308 × 100`

Percentagem operacional:

`soma das verificações concluídas / (308 × 16) × 100`

As duas métricas devem ser apresentadas separadamente. Um município parcialmente pesquisado aumenta a percentagem operacional, mas não a territorial.

## Regra de atualização da lista

A referência territorial é a CAOP2025. Quando existir nova CAOP:

1. comparar municípios;
2. adicionar, remover ou renomear unidades;
3. preservar todo o histórico;
4. registar a migração no `schema_version`.

A CAOP é a referência oficial mantida pela Direção-Geral do Território para limites administrativos.
