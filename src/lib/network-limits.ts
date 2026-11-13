import { NETWORK } from '../config/app'

let active = 0
const queue: (() => void)[] = []

/** Limit complete REST transports, including response streaming, across consumers. */
export function withNetworkSlot<T>(task: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason)
  if (queue.length >= NETWORK.maxQueuedRequests) return Promise.reject(new Error('Request queue is full.'))
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      const index = queue.indexOf(start)
      if (index >= 0) queue.splice(index, 1)
      reject(signal.reason)
    }
    const start = () => {
      signal.removeEventListener('abort', abort)
      if (signal.aborted) {
        reject(signal.reason)
        return
      }
      active++
      let request: Promise<T>
      try {
        request = task()
      } catch (error) {
        request = Promise.reject(error)
      }
      request.then(resolve, reject).finally(() => {
        active--
        queue.shift()?.()
      })
    }
    if (active < NETWORK.maxConcurrentRequests) start()
    else {
      queue.push(start)
      signal.addEventListener('abort', abort, { once: true })
    }
  })
}
