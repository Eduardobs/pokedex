import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Falha de renderização não recuperável', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="fatal-error" role="alert">
        <div>
          <span aria-hidden="true">!</span>
          <h1>Não foi possível exibir esta página</h1>
          <p>Ocorreu uma falha inesperada. Seus favoritos continuam salvos neste dispositivo.</p>
          <button type="button" onClick={() => window.location.reload()}>Recarregar aplicação</button>
        </div>
      </main>
    )
  }
}
