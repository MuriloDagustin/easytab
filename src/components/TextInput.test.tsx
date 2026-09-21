import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInput } from './TextInput'

describe('TextInput', () => {
  it('mostra o erro do parser', () => {
    render(
      <TextInput
        value="nada"
        onChange={() => {}}
        onProcess={() => {}}
        onBack={() => {}}
        onUseExample={() => {}}
        error="Não encontrei um bloco de 6 cordas."
        fromImage={false}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('6 cordas')
  })

  it('avisa para revisar quando o texto veio de imagem', () => {
    render(
      <TextInput
        value="e|--3--|"
        onChange={() => {}}
        onProcess={() => {}}
        onBack={() => {}}
        onUseExample={() => {}}
        error={null}
        fromImage
      />,
    )
    expect(screen.getByText(/leitura automática da imagem/)).toBeInTheDocument()
  })

  it('desabilita processar com o editor vazio', () => {
    render(
      <TextInput
        value=""
        onChange={() => {}}
        onProcess={() => {}}
        onBack={() => {}}
        onUseExample={() => {}}
        error={null}
        fromImage={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Processar tablatura' })).toBeDisabled()
  })

  it('processa o texto editado', async () => {
    const onProcess = vi.fn()
    render(
      <TextInput
        value="e|--3--|"
        onChange={() => {}}
        onProcess={onProcess}
        onBack={() => {}}
        onUseExample={() => {}}
        error={null}
        fromImage={false}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Processar tablatura' }))
    expect(onProcess).toHaveBeenCalledOnce()
  })
})
