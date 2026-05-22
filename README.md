# Roleta Práctica - EXPOSUL 2026

Site estático mobile-first para a roleta de prêmios da Práctica no jantar da EXPOSUL 2026, em Chapadão do Sul.

## Fluxo

1. A pessoa abre pelo QR code no celular.
2. Vê a roleta e toca na própria roleta para girar.
3. Informa o nome completo.
4. O backend confere se o nome já participou.
5. Se for a primeira vez, o backend grava nome, prêmio e código na planilha.
6. A roleta anima até o prêmio registrado.
7. O botão do resultado abre uma mensagem pronta no WhatsApp `+55 67 8413-2037`.

## Backend com Google Sheets

1. Crie uma planilha no Google Sheets.
2. Na planilha, abra `Extensões` > `Apps Script`.
3. Copie o conteúdo de `apps-script/Code.gs` para o editor.
4. Clique em `Implantar` > `Nova implantação`.
5. Tipo: `App da Web`.
6. Executar como: `Eu`.
7. Quem tem acesso: `Qualquer pessoa`.
8. Autorize e copie a URL terminada em `/exec`.
9. Cole essa URL em `config.js`:

```js
window.PRACTICA_BACKEND_URL = "https://script.google.com/macros/s/SEU_ID/exec";
```

Sem essa URL, o site publicado não sorteia prêmios. Em `localhost`, ele roda em modo teste para prévia.

## Como trocar os prêmios

Edite a lista `prizes` no arquivo `app.js`. Cada item tem:

- `label`: texto que aparece na roleta
- `color`: cor da fatia
- `text`: cor do texto

## Controle de participação

O backend normaliza o nome completo e impede novo giro com o mesmo nome. Se o nome já existir na planilha, o site carrega o prêmio já registrado em vez de sortear outro.

O site também salva o resultado no celular usando `localStorage`, mas a conferência real deve ser feita pela planilha.

## Publicação no GitHub Pages

Em `Settings` > `Pages`, use:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`
