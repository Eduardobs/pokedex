import { fetchPokemonModel } from '../../lib/pokemon-model'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ModelViewerElement } from '@google/model-viewer'
import { useLanguage } from '../../contexts/LanguageContext'
import { fetchPokemon3D, selectPokemon3D } from '../../lib/pokemon-3d'
import { idFromUrl, prettyName } from '../../lib/api'
import type { Pokemon } from '../../types'
import { Loading } from '../Loading'
import { InlineRetryError } from '../FeedbackState'

function Model({ src, label, viewerReady }: { src: string; label: string; viewerReady: boolean }) {
  const ref = useRef<ModelViewerElement>(null)
  const { t } = useLanguage()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined
    setModelUrl(null)
    setStatus('loading')
    fetchPokemonModel(src, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setModelUrl(objectUrl)
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error')
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, attempt])
  useLayoutEffect(() => {
    const viewer = ref.current
    if (!viewer) return
    if (viewer.loaded) {
      setStatus('ready')
      return
    }
    setStatus('loading')
    const loaded = () => {
      clearTimeout(timeout)
      setStatus('ready')
    }
    const failed = () => {
      clearTimeout(timeout)
      setStatus('error')
      setModelUrl(null)
    }
    viewer.addEventListener('load', loaded)
    viewer.addEventListener('error', failed)
    const timeout = setTimeout(failed, 60000)
    return () => {
      clearTimeout(timeout)
      viewer.removeEventListener('load', loaded)
      viewer.removeEventListener('error', failed)
    }
  }, [attempt, modelUrl, viewerReady])
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
      {viewerReady && modelUrl && (
        <model-viewer
          key={attempt}
          ref={ref}
          src={modelUrl}
          alt={label}
          camera-controls
          loading="eager"
          touch-action="pan-y"
          interaction-prompt="none"
          className="pokemon-model"
        />
      )}
      <p className="muted">{t('detail.modelControls')}</p>
    </>
  )
}

export default function Pokemon3DTab({ pokemon, shiny }: { pokemon: Pokemon; shiny: boolean }) {
  const { t } = useLanguage()
  const [attempt, setAttempt] = useState(0)
  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [state, setState] = useState<{ key: string; src: string | null; error: boolean } | null>(null)
  const key = `${pokemon.id}:${shiny}:${attempt}`
  useEffect(() => {
    let active = true
    setViewerStatus((current) => (current === 'ready' ? current : 'loading'))
    import('../../lib/model-viewer')
      .then(() => {
        if (active) setViewerStatus('ready')
      })
      .catch(() => {
        if (active) setViewerStatus('error')
      })
    return () => {
      active = false
    }
  }, [attempt])
  useEffect(() => {
    const controller = new AbortController()
    fetchPokemon3D(controller.signal)
      .then((catalog) => {
        if (!controller.signal.aborted)
          setState({ key, src: selectPokemon3D(catalog, pokemon, idFromUrl(pokemon.species.url), shiny), error: false })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, src: null, error: true })
      })
    return () => controller.abort()
  }, [key, pokemon, shiny])
  if (state?.key !== key) return <Loading label={t('detail.modelLoading')} />
  if (state.error || viewerStatus === 'error')
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
      viewerReady={viewerStatus === 'ready'}
      label={t('detail.modelLabel', {
        name: prettyName(pokemon.name),
        version: shiny ? t('detail.shiny') : t('detail.modelRegular'),
      })}
    />
  )
}
