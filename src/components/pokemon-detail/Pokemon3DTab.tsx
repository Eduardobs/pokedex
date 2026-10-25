import { createElement, useEffect, useRef, useState } from 'react'
import type { ModelViewerElement } from '@google/model-viewer'
import { useLanguage } from '../../contexts/LanguageContext'
import { fetchPokemon3D, selectPokemon3D } from '../../lib/pokemon-3d'
import { idFromUrl, prettyName } from '../../lib/api'
import type { Pokemon } from '../../types'
import { Loading } from '../Loading'
import { InlineRetryError } from '../FeedbackState'

function Model({ src, label }: { src: string; label: string }) {
  const ref = useRef<ModelViewerElement>(null)
  const { t } = useLanguage()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const viewer = ref.current
    if (!viewer) return
    setStatus('loading')
    const loaded = () => {
      clearTimeout(timeout)
      setStatus('ready')
    }
    const failed = () => {
      clearTimeout(timeout)
      setStatus('error')
    }
    viewer.addEventListener('load', loaded)
    viewer.addEventListener('error', failed)
    const timeout = setTimeout(failed, 60000)
    return () => {
      clearTimeout(timeout)
      viewer.removeEventListener('load', loaded)
      viewer.removeEventListener('error', failed)
    }
  }, [attempt])
  return (
    <>
      {status === 'loading' && <Loading label={t('detail.modelLoading')} />}
      {status === 'error' && (
        <InlineRetryError
          message={t('detail.modelError')}
          retryLabel={t('common.retry')}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}
      {createElement('model-viewer', {
        key: attempt,
        ref,
        src,
        alt: label,
        'camera-controls': true,
        loading: 'eager',
        'touch-action': 'pan-y',
        'interaction-prompt': 'none',
        className: 'pokemon-model',
        style: { display: status === 'error' ? 'none' : 'block' },
      })}
      <p className="muted">{t('detail.modelControls')}</p>
    </>
  )
}

export default function Pokemon3DTab({ pokemon, shiny }: { pokemon: Pokemon; shiny: boolean }) {
  const { t } = useLanguage()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; src: string | null; error: boolean } | null>(null)
  const key = `${pokemon.id}:${shiny}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetchPokemon3D(controller.signal), import('../../lib/model-viewer')])
      .then(([catalog]) => {
        if (!controller.signal.aborted)
          setState({ key, src: selectPokemon3D(catalog, pokemon, idFromUrl(pokemon.species.url), shiny), error: false })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, src: null, error: true })
      })
    return () => controller.abort()
  }, [key, pokemon, shiny])
  if (state?.key !== key) return <Loading label={t('detail.modelLoading')} />
  if (state.error)
    return (
      <InlineRetryError
        message={t('detail.modelError')}
        retryLabel={t('common.retry')}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    )
  if (!state.src) return <p role="status">{t('detail.modelUnavailable')}</p>
  return (
    <Model
      key={state.src}
      src={state.src}
      label={t('detail.modelLabel', {
        name: prettyName(pokemon.name),
        version: shiny ? t('detail.shiny') : t('detail.modelRegular'),
      })}
    />
  )
}
