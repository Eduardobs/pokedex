import { Component, type ErrorInfo, type ReactNode } from 'react'
import { fatalErrorMessages, type MessageLanguage } from '../i18n/messages'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Unrecoverable render failure', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const language = document.documentElement.lang as MessageLanguage
    const text = fatalErrorMessages[language] ?? fatalErrorMessages['pt-BR']

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
