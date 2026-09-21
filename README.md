# Tab Fácil

Aplicação web que transforma uma tablatura de guitarra (texto colado ou imagem) em uma
experiência guiada nota por nota: tablatura destacada, instrução em português, braço de
guitarra visual e reprodução sonora. Sem backend, sem login, sem banco de dados.

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

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/domain/tab/parser.ts` | Parser de tablatura: blocos de 6 cordas, colunas, técnicas |
| `src/domain/tab/types.ts` | Tipos de nota, evento, técnica e bloco |
| `src/domain/tab/fixtures.ts` | Tablaturas de exemplo usadas no app e nos testes |
| `src/domain/music/tuning.ts` | Afinação padrão e conversão corda/casa para frequência |
| `src/domain/instructions/describe.ts` | Evento da tab para instrução em português |
| `src/domain/fingering/suggest.ts` | Sugestão conservadora de dedo |
| `src/audio/player.ts` | Reprodução com Tone.js (carregado sob demanda) |
| `src/ocr/recognize.ts` | OCR com Tesseract.js (carregado sob demanda) |
| `src/storage/persistence.ts` | Sessão salva em localStorage |
| `src/state/appReducer.ts` | Estado da aplicação |
| `src/components/` | Telas e componentes visuais |

## Limitações conhecidas

- **Ritmo.** Tablatura em texto não carrega duração confiável. Todos os eventos têm a mesma
  duração na reprodução e o espaçamento só preserva a ordem. O app avisa isso na legenda.
- **OCR.** A leitura de imagem erra com frequência, principalmente em linhas de hífens e
  entre `|` e `l`. Por isso o texto reconhecido sempre passa pelo editor antes de processar.
  Na primeira execução o Tesseract baixa o modelo de idioma da internet.
- **Timbre.** A síntese é simples (onda triangular); as alturas estão corretas em afinação
  padrão `E2 A2 D3 G3 B3 E4`, mas o som não imita uma guitarra real.
- **Slide e bend no áudio.** São indicados por um segundo toque na nota de destino, não por
  um glissando contínuo.
- **Sugestão de dedo.** Só aparece quando o trecho cabe em uma posição de 4 casas. Fora
  disso o app mostra apenas a posição, sem inventar digitação.
- **Símbolos não suportados.** `x` (corda abafada), tapping, palm mute e cifras escritas
  acima da tab são ignorados, com aviso na tela.
