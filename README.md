# Belém Live Cams

Plataforma estática para catalogar webcams públicas de Belém, Pará, preparada para crescer para outras cidades, regiões e países.

## Funcionalidades

- Grelha responsiva de câmaras
- Pesquisa e filtros por estado
- Separação entre feeds únicos e fontes alternativas
- Mapa Leaflet com OpenStreetMap
- Tema claro e escuro
- Dados em `data/cameras.json`
- Sem framework, servidor ou custos obrigatórios

## Executar localmente

```bash
python3 -m http.server 8080
```

Depois abre `http://localhost:8080`.

## GitHub Pages

Em **Settings → Pages**, seleciona:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

O site ficará em:

`https://luisftsilva.github.io/eye/`

## Adicionar câmaras

Edita `data/cameras.json`. O site lê automaticamente a lista e atualiza a grelha, filtros, estatísticas e mapa.

## Nota

O projeto apenas cataloga fontes públicas e mantém a atribuição ao fornecedor. Não copia nem retransmite vídeo. Streams que bloqueiem incorporação são abertos no site original.
