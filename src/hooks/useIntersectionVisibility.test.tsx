import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIntersectionVisibility } from './useIntersectionVisibility'

function Probe({ initiallyVisible = false }: { initiallyVisible?: boolean }) {
  const { targetRef, visible } = useIntersectionVisibility<HTMLDivElement>(initiallyVisible, '64px')
  return <div ref={targetRef}>{visible ? 'visible' : 'hidden'}</div>
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useIntersectionVisibility', () => {
  it('reveals content immediately when IntersectionObserver is unavailable', async () => {
    Reflect.deleteProperty(window, 'IntersectionObserver')

    render(<Probe />)

    expect(await screen.findByText('visible')).toBeVisible()
  })

  it('waits for intersection, then disconnects the observer', () => {
    let callback: IntersectionObserverCallback | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    class ObserverMock {
      constructor(nextCallback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        callback = nextCallback
        expect(options?.rootMargin).toBe('64px')
      }

      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
      takeRecords = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', ObserverMock)

    render(<Probe />)
    expect(screen.getByText('hidden')).toBeVisible()
    expect(observe).toHaveBeenCalledOnce()

    act(() => callback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(screen.getByText('hidden')).toBeVisible()
    expect(disconnect).not.toHaveBeenCalled()

    act(() => callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(screen.getByText('visible')).toBeVisible()
    expect(disconnect).toHaveBeenCalled()
  })

  it('does not create an observer for content already known to be visible', () => {
    const observer = vi.fn()
    vi.stubGlobal('IntersectionObserver', observer)

    render(<Probe initiallyVisible />)

    expect(screen.getByText('visible')).toBeVisible()
    expect(observer).not.toHaveBeenCalled()
  })
})
