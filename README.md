# Roleta Práctica - EXPOSUL 2026

Site estático mobile-first para a roleta de prêmios da Práctica no jantar da EXPOSUL 2026, em Chapadão do Sul.

## Fluxo

1. A pessoa abre pelo QR code no celular.
2. Vê a roleta e toca para girar.
3. Informa o nome completo.
4. A roleta gira uma única vez naquele celular/navegador.
5. O resultado fica salvo localmente.
6. O botão abre uma mensagem pronta no WhatsApp `+55 67 8413-2037`.

## Como trocar os prêmios

Edite a lista `prizes` no arquivo `app.js`. Cada item tem:

- `label`: texto que aparece na roleta
- `color`: cor da fatia
- `text`: cor do texto

## Controle de participação

O site salva o resultado no navegador do celular usando `localStorage`. Isso impede novos giros no mesmo celular/navegador após o primeiro resultado.

Como o site é estático e não tem banco de dados, essa trava não impede tentativa por outro celular, outro navegador, aba anônima ou limpeza dos dados do navegador. Para bloqueio global por lista de convidados, será necessário um backend simples.

## Publicação no GitHub Pages

Em `Settings` > `Pages`, use:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`
