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
- **Treino de velocidade.** Repete o trecho e sobe a velocidade a cada volta até um alvo.
- **Metrônomo e bateria** no andamento e no compasso reais: BPM digitado ou marcado no tempo,
  compasso 2/4, 3/4 ou 4/4 e a figura que vale cada nota normal.
- **Bend, slide e ligados contínuos.** Cada corda tem uma voz: o bend sobe de altura sem
  cortar, o slide passa casa por casa e hammer-on e pull-off não palhetam de novo.
- **Ritmo gravado tocando junto.** Com a música original tocando, o aluno aperta espaço a cada
  nota; o app mede os intervalos e usa esse andamento e essas durações na reprodução.
- **Repetições e saltos da tab.** "2X", "2 vezes" e "x2" repetem de verdade; "repete o refrão"
  e "volta ao início" tocam a seção citada. Dá para desligar.
- **Afinador cromático** pelo microfone, com ponteiro e indicação de apertar ou soltar a tarraxa.
- **Diagrama de acorde** ao tocar numa cifra, em qualquer afinação, com extensões (7(9),
  add9, m7b5…) e baixo invertido, e a digitação.
- **Partitura acima da tab**, opcional, com tonalidade detectada, armadura e figuras de
  duração quando o ritmo está anotado.
- **Modo canhoto** no braço e nos diagramas, e **outras posições da mesma nota** no braço.
- **Sequência de dias e pontuação** da prática com microfone, com estrelas por aproveitamento.
- **Impressão ou PDF** da tablatura, em preto no branco.

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

- **Ritmo.** Tablatura em texto não carrega duração, e o app não adivinha. Sem anotação, todas
  as notas duram o mesmo e a partitura mostra só as alturas. Marcar o ritmo tocando junto com
  a música, ou escolher durações à mão, resolve para aquela tab.
- **OCR.** Recorte por linha e regras de consistência (rótulos, letras parecidas com dígitos,
  comprimento das linhas) reduzem os erros, mas dígitos parecidos como 3 e 8 ainda escapam.
  O texto sempre passa pelo editor. Na primeira vez, o modelo de OCR é baixado da internet.
- **Detecção pelo microfone.** Precisa de ambiente silencioso. Acordes são conferidos pelo
  perfil de cada nota no espectro, sem distinguir a oitava; distorção pesada atrapalha.
- **Som.** As amostras são as mesmas para todas as cordas; um filtro por corda e casa deixa
  a corda grossa mais escura, mas não substitui gravações feitas corda por corda.
- **Sugestão de dedo.** O planejamento cobre trechos inteiros, mas só mostra dedos em acordes
  e em trechos na mesma posição da mão que percorrem pelo menos três casas.
- **Saltos da tab.** "Repete o refrão", "volta pra intro", "volta ao início" e "D.C." são
  entendidos. Instruções escritas de outro jeito ficam só como texto.
- **Partitura.** Tonalidade detectada automaticamente; acidentes aparecem em toda nota que
  foge da armadura, sem valer pelo compasso inteiro, e não há ligaduras de valor nem pausas.
- **Diagramas.** Na afinação padrão, usam as formas clássicas; nas outras, a forma é
  calculada e pode não ser a mais comum entre guitarristas.
- **Importar pelo link do Cifra Club.** Exigiria um servidor, e os termos de uso do site pesam.
