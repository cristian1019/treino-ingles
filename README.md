# ⌨️ Treino de Inglês

Aplicativo web para **treinar digitação e inglês ao mesmo tempo**. Você aprende vocabulário digitando palavras e frases, e pratica a conversação falando com uma IA que corrige seus erros e ensina frases novas.

🌐 **Acesse:** https://cristian1019.github.io/treino-ingles/

Feito só com HTML, CSS e JavaScript, sem frameworks e sem servidor próprio. Tudo é gratuito.

## Funcionalidades

### 📚 Vocabulário — 1000 palavras
- 4 níveis: **Iniciante, Básico, Intermediário e Avançado**, cada um com **25 fases de 10 palavras**.
- Cada palavra tem emoji, tema, pronúncia em áudio, tradução, frase de exemplo e tradução da frase.
- Primeiro você digita a palavra, depois a frase. As letras ficam verdes quando estão certas e vermelhas quando estão erradas.
- **Dica** (`Ctrl+Espaço`) mostra a tradução. Ela fica registrada, mas não tira estrelas.
- No fim da fase aparecem as estrelas (pela precisão), as palavras por minuto e a lista das palavras com tradução e áudio.
- Treino por **tema** (comida, viagem, trabalho, saúde…) e uma tela de **revisão** com as palavras em que você mais erra.

### 🗣️ Conversa com IA (Google Gemini)
- 10 situações do dia a dia: conversa livre, conhecer alguém, cafeteria, restaurante, loja de roupas, aeroporto, hotel, pedir direções, consulta médica e entrevista de emprego.
- Você **fala** (segure `Espaço` ou clique no microfone) ou **digita**, e a IA responde em inglês **em voz alta**.
- A cada fala, um painel de professor em português mostra:
  - ✏️ a **correção** do que você disse, com explicação;
  - 💡 uma **dica** de gramática, pronúncia ou cultura;
  - ⭐ uma **frase nova** útil para a situação, com o botão **🎤 Repetir** para treinar a pronúncia.
- A IA ajusta o vocabulário ao seu nível.
- No fim da conversa aparece um resumo, e as frases novas vão para **Minhas frases**, onde viram exercícios de digitação.

### 📊 Estatísticas
- Palavras dominadas, fases concluídas, palavras por minuto, precisão e dias seguidos.
- Gráfico de minutos praticados nos últimos 14 dias.
- Escolha da voz, da velocidade da fala e da opção de ignorar maiúsculas.
- **Backup:** exportar e importar o progresso em `.json`.

## Como usar a Conversa com IA (grátis)

1. Crie uma chave gratuita no [Google AI Studio](https://aistudio.google.com/apikey). É só entrar com sua conta Google e clicar em **Create API key**. Não precisa de cartão.
2. No app, abra **Conversa IA** e cole a chave.
3. Use o **Google Chrome** ou o **Microsoft Edge** para falar pelo microfone. No Brave e no Firefox o reconhecimento de voz não funciona, mas dá para conversar digitando.

> 🔒 A chave fica salva **só no seu navegador** (`localStorage`) e é enviada apenas para a API do Google. Ela não entra no backup. O plano gratuito do Gemini tem limite de pedidos por minuto e por dia; se passar do limite, o app avisa.

## Rodar no seu computador

1. Clone o repositório.
2. Dê dois cliques em **`Iniciar.bat`** (Windows). Ele inicia um pequeno servidor em PowerShell e abre `http://localhost:8765`.

O servidor local é necessário para o microfone, porque os navegadores só liberam o reconhecimento de voz em `https` ou `localhost`. O modo de vocabulário também funciona abrindo o `index.html` direto.

## Atalhos

| Tecla | Ação |
|---|---|
| `Tab` | ouvir de novo |
| `Ctrl` + `Espaço` | dica (tradução) |
| `Enter` | próxima / enviar |
| `Espaço` (segurar) | falar com a IA |
| `Esc` | sair |

## Estrutura

```
├── index.html         # telas do app
├── estilo.css         # visual (tema claro e escuro)
├── app.js             # digitação, fases, revisão, dicionário, estatísticas
├── conversa.js        # conversa com IA: Gemini, microfone e voz
├── dados/
│   └── nivel1.js … nivel4.js   # 250 palavras cada
├── Iniciar.bat        # abre o app localmente (Windows)
└── servidor.ps1       # servidor HTTP local (PowerShell)
```

### Formato das palavras

Cada linha de `dados/nivelN.js`:

```
palavra|tradução|emoji|tema|frase de exemplo|tradução da frase
dog|cachorro|🐶|animais|The dog has a wet nose.|O cachorro tem o nariz molhado.
```

## Tecnologias

- **Reconhecimento de voz:** Web Speech API (`SpeechRecognition`) do navegador.
- **Voz:** `speechSynthesis` do navegador.
- **IA:** [Gemini API](https://ai.google.dev/) com resposta em JSON estruturado. O app escolhe automaticamente um modelo *Flash* disponível na chave do usuário.
- **Progresso:** `localStorage`.

## Licença

[MIT](LICENSE)
