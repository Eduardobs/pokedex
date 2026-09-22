import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

const fallbackMessages = {
  'pt-BR': {
    title: 'Não foi possível exibir esta página',
    message: 'Ocorreu uma falha inesperada. Seus favoritos continuam salvos neste dispositivo.',
    reload: 'Recarregar aplicação',
  },
  en: {
    title: 'This page could not be displayed',
    message: 'An unexpected error occurred. Your favorites remain saved on this device.',
    reload: 'Reload application',
  },
  es: {
    title: 'No se pudo mostrar esta página',
    message: 'Ocurrió un error inesperado. Tus favoritos siguen guardados en este dispositivo.',
    reload: 'Recargar aplicación',
  },
} as const

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
    const language = document.documentElement.lang as keyof typeof fallbackMessages
    const text = fallbackMessages[language] ?? fallbackMessages['pt-BR']

    return (
      <main className="fatal-error" role="alert">
        <div>
          <span aria-hidden="true">!</span>
          <h1>{text.title}</h1>
          <p>{text.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {text.reload}
          </button>
        </div>
      </main>
    )
  }
}
