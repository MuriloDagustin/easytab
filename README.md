# Tab Fácil

Aplicação web que transforma uma tablatura de guitarra (texto colado ou imagem) em uma
experiência guiada nota por nota: tablatura destacada, instrução em português, braço de
guitarra visual, reprodução sonora e prática com o microfone. Sem backend, sem login, sem
banco de dados. Instalável como PWA e funciona offline.

## Instalar e executar

```bash
npm install
npm run dev       # servidor de desenvolvimento em http://localhost:5173
npm test          # testes (Vitest + React Testing Library)
npm run lint      # oxlint + verificação de tipos
npm run build     # build de produção em dist/
npm run preview   # serve o build (necessário para testar o PWA)
```

O PWA (service worker e manifesto) só funciona no build de produção: rode
`npm run build && npm run preview` e instale pelo navegador.

## O que o app faz

- **Entrada por texto ou imagem.** O texto sempre passa por um editor antes de processar.
  A imagem passa por OCR linha a linha e o resultado também vai para o editor.
- **Parser próprio** com blocos de 6 cordas, casas de dois dígitos, notas simultâneas por
  alinhamento vertical, técnicas `~ / \ h p b r t`, corda abafada `x`, palm mute (`PM`) e
  cifras escritas acima da tab. Aceita a música inteira colada de sites como o Cifra Club:
  títulos de seção e observações viram rótulos dos blocos, quebras de linha do site viram
  blocos seguintes, o rótulo `E` repetido nas duas pontas é tratado pela ordem das linhas,
  travessões viram hífens e letras da música entre os blocos são ignoradas. Testado com a
  cifra completa de Sweet Child O' Mine (1102 notas em 95 blocos, sem avisos).
- **Três visualizações sincronizadas:** tablatura desenhada em SVG no estilo dos sites de
  partitura (linhas das cordas, números sobre as linhas, barras de compasso, cifras e técnicas),
  com o texto original disponível num botão; instrução em português; e braço em SVG com
  sugestão de dedo quando a posição da mão é clara.
- **Reprodução** com contagem regressiva, velocidade, repetição de trecho e ritmo manual
  (duração curta, normal ou longa e pausas por nota).
- **Som com gravações reais** de violão de aço, guitarra elétrica e violão de nylon, mais um
  sintetizador leve como alternativa. As amostras vêm do projeto
  [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) (MIT), cortadas em
  3,5 s, e são baixadas só quando você escolhe cada instrumento (cerca de 1 MB cada). Ficam
  no cache do service worker para uso offline.
- **Modo "uma corda de cada vez"** para estudar só as notas de uma corda.
- **Afinações alternativas e capotraste**, refletidos nos nomes das cordas, no som e nas
  instruções. Toque na letra da corda no braço para ouvi-la solta e afinar.
- **Prática com microfone:** o app detecta a nota tocada e avança sozinho quando você acerta.
- **Biblioteca de tablaturas** em localStorage, com progresso, ritmo, afinação e histórico
  de prática por tab. Trechos marcados como difíceis e notas com muitos erros aparecem em
  "Revisão", com um botão que monta um loop curto para praticar.
- **Compartilhar por link.** A tab, a afinação e o capo vão codificados na URL.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/domain/tab/parser.ts` | Parser de tablatura: blocos, colunas, técnicas, cifras, palm mute |
| `src/domain/tab/types.ts` | Tipos de nota, evento, técnica e bloco |
| `src/domain/music/tuning.ts` | Afinações, capo e conversão corda/casa para frequência |
| `src/domain/instructions/describe.ts` | Evento da tab para instrução em português |
| `src/domain/fingering/suggest.ts` | Sugestão de dedo mantendo a posição da mão |
| `src/domain/rhythm.ts` | Anotações manuais de duração e pausa |
| `src/domain/review.ts` | Sugestão de trechos para revisar |
| `src/audio/player.ts` | Reprodução: Sampler com amostras reais ou sintetizador (Tone.js sob demanda) |
| `src/audio/instruments.ts` | Instrumentos disponíveis e mapa de amostras |
| `public/samples/` | Amostras MP3 por instrumento (licença em `LICENSE.txt`) |
| `src/audio/pitch.ts` | Detecção de altura pelo microfone |
| `src/ocr/recognize.ts` | OCR com Tesseract.js por linha (carregado sob demanda) |
| `src/share/url.ts` | Codificação da tab na URL |
| `src/storage/persistence.ts` | Biblioteca e preferências em localStorage |
| `src/state/appReducer.ts` | Estado da aplicação |
| `src/components/player/TabGraphic.tsx` | Tablatura desenhada em SVG |
| `src/components/` | Telas e componentes visuais |

## Limitações conhecidas

- **Ritmo.** Tablatura em texto não carrega duração. Por padrão todos os eventos duram o
  mesmo; você pode ajustar durações e pausas manualmente, mas o app não adivinha o ritmo.
- **OCR.** A leitura de imagem melhora ao recortar linha por linha, mas ainda confunde
  dígitos parecidos (3 e 8, 0 e 6) e perde barras. O texto sempre passa pelo editor.
  Na primeira execução o Tesseract baixa o modelo da internet.
- **Detecção de altura.** Funciona bem com uma nota por vez em ambiente silencioso. Em
  acordes, basta uma das notas esperadas ser detectada. Distorção e ruído confundem.
- **Som.** As gravações têm uma nota a cada 2 ou 3 semitons; as outras são transpostas a
  partir da mais próxima, o que soa natural nesse intervalo. Não há variação de timbre por
  corda (a mesma nota na 2ª ou na 3ª corda soa igual). Na primeira vez, cada instrumento
  precisa de internet para baixar as amostras; sem elas o app cai no sintetizador.
- **Slide e bend no áudio.** Indicados por um segundo toque mais suave na nota de destino.
  Hammer-on, pull-off e tapping saem com ataque mais fraco, mas sem ligadura real.
- **Sugestão de dedo.** Só aparece quando o trecho cabe em uma posição de 4 casas.
  Fora disso o app mostra apenas a posição.
- **Cifras.** Reconhecidas quando escritas sozinhas na linha imediatamente acima do bloco.
