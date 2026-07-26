# Automatização da auditoria nacional de webcams

## Objetivo

O workflow `Automated Portugal Webcam Audit` percorre sequencialmente os municípios ainda não concluídos, executa as 16 verificações obrigatórias, guarda evidência positiva e negativa, classifica candidatos e atualiza o progresso nacional.

## Execução

- Automática: diariamente às `01:17 UTC`.
- Manual: GitHub → Actions → `Automated Portugal Webcam Audit` → `Run workflow`.
- Por defeito são processados 3 municípios em cada execução.
- O parâmetro `limit` permite alterar o lote.
- O parâmetro `municipality_id` força uma auditoria específica.

## Ficheiros produzidos

- `audit/evidence/<municipality-id>.json`: consultas, URLs verificadas, candidatos e classificação.
- `audit/last-automated-run.json`: resumo da última execução.
- `audit/auto-cameras.json`: feeds de confiança elevada aprovados pelo classificador automático.
- `audit/municipalities.csv`: estado por município.
- `audit/progress-current.json`: progresso territorial e operacional.

## Motores e fontes

Sem configuração adicional, o crawler consulta Bing e DuckDuckGo e inspeciona resultados de fornecedores, agregadores, municípios, turismo, praias, portos, aeroportos, transportes, natureza, hotéis, desporto, meteorologia, YouTube e padrões técnicos de stream.

Para acrescentar resultados Google, criar no repositório o secret:

`SERPER_API_KEY`

O crawler continua funcional sem esse secret; nesse caso, a verificação marcada como Google usa DuckDuckGo como fallback e regista essa execução nas evidências.

## Publicação conservadora

A descoberta e a publicação são separadas:

1. Todos os candidatos são guardados nas evidências.
2. URLs são normalizadas e comparadas com a base existente.
3. Duplicados são classificados e não são novamente publicados.
4. Apenas candidatos com confiança igual ou superior a 85 entram em `auto-cameras.json`.
5. A confiança elevada exige normalmente um endpoint público de vídeo/snapshot ou uma página de um fornecedor autorizado que identifique claramente o município e a webcam.
6. Candidatos duvidosos ficam como `possible_duplicate` ou `rejected` para revisão, em vez de contaminarem o mapa.

## Segunda passagem automática

`scripts/update_audit_progress.py` funciona como validador determinístico independente:

- exige exatamente 16 verificações;
- exige consultas registadas em todas as verificações;
- confirma que todos os candidatos possuem uma classificação permitida;
- só depois marca o município como `complete`;
- atualiza o CSV e o resumo global.

## Commits

Cada execução com alterações cria um commit na `main` com a mensagem:

`audit: process next Portugal municipalities`

O workflow usa um grupo de concorrência único para impedir duas auditorias simultâneas e faz `pull --rebase` antes do `push`.

## Limitações deliberadas

- Alguns motores bloqueiam pesquisa automatizada ou alteram o HTML. Essas falhas ficam visíveis através de listas de URLs vazias e podem ser revistas.
- Páginas que exigem autenticação, CAPTCHA ou acesso privado não são contornadas.
- A automatização não tenta aceder a câmaras privadas nem adivinhar credenciais.
- Coordenadas exatas devem ser obtidas da fonte ou revistas antes da exposição cartográfica quando o fornecedor não as disponibiliza.
