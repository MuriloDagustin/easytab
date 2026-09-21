const SYMBOLS: Array<[string, string]> = [
  ['0', 'Corda solta: toque a corda sem apertar nenhuma casa.'],
  ['3', 'Qualquer número é a casa que você aperta naquela corda.'],
  ['10', 'Números de dois dígitos são casas altas, como a 10 ou a 12.'],
  ['~', 'Vibrato: mantenha a nota e balance o dedo.'],
  ['/', 'Slide subindo: deslize o dedo até a casa seguinte.'],
  ['\\', 'Slide descendo: deslize o dedo para trás.'],
  ['h', 'Hammer-on: martele o dedo na casa seguinte sem palhetar.'],
  ['p', 'Pull-off: puxe o dedo para soar a casa anterior sem palhetar.'],
  ['b', 'Bend: empurre a corda para o lado até a nota subir.'],
  ['r', 'Release: solte o bend e volte à nota original.'],
]

export function Legend() {
  return (
    <div className="space-y-4 text-sm">
      <ul className="space-y-2 text-muted">
        <li>A leitura acontece da esquerda para a direita, como um texto.</li>
        <li>A linha de cima é a 1ª corda (a mais fina); a de baixo é a 6ª corda (a mais grossa).</li>
        <li>Números alinhados na vertical são tocados ao mesmo tempo.</li>
      </ul>

      <dl className="grid gap-2 sm:grid-cols-2">
        {SYMBOLS.map(([symbol, meaning]) => (
          <div key={symbol} className="flex gap-3 rounded-lg bg-surface-2 p-2.5">
            <dt className="min-w-8 text-center font-mono font-bold text-accent">{symbol}</dt>
            <dd className="text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>

      <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-accent-strong">
        Atenção ao ritmo: a tablatura simples em texto normalmente não informa a duração das notas. O espaçamento
        aqui só preserva a ordem, não o tempo exato. Use um áudio da música como referência.
      </p>
    </div>
  )
}
