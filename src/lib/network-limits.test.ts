import { expect, it } from 'vitest'
import { NETWORK } from '../config/app'
import { withNetworkSlot } from './network-limits'

it('caps simultaneous transports and removes aborted queued work', async () => {
  let active = 0,
    maximum = 0,
    calls = 0
  const release: (() => void)[] = []
  const task = () =>
    new Promise<void>((resolve) => {
      calls++
      active++
      maximum = Math.max(active, maximum)
      release.push(() => {
        active--
        resolve()
      })
    })
  const controller = new AbortController()
  const requests = Array.from({ length: NETWORK.maxConcurrentRequests }, () =>
    withNetworkSlot(task, new AbortController().signal),
  )
  const queued = withNetworkSlot(task, controller.signal)
  const rejected = expect(queued).rejects.toMatchObject({ name: 'AbortError' })
  const next = withNetworkSlot(task, new AbortController().signal)
  controller.abort()
  await rejected
  expect(calls).toBe(NETWORK.maxConcurrentRequests)
  release.shift()!()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(calls).toBe(NETWORK.maxConcurrentRequests + 1)
  release.splice(0).forEach((done) => done())
  await Promise.all([...requests, next])
  expect(maximum).toBe(NETWORK.maxConcurrentRequests)
})

it('rejects already aborted work and bounds the waiting queue', async () => {
  const aborted = new AbortController()
  aborted.abort()
  await expect(withNetworkSlot(async () => 1, aborted.signal)).rejects.toMatchObject({ name: 'AbortError' })
  const controllers = Array.from(
    { length: NETWORK.maxConcurrentRequests + NETWORK.maxQueuedRequests },
    () => new AbortController(),
  )
  const done: (() => void)[] = []
  const requests = controllers.map((controller) =>
    withNetworkSlot(() => new Promise<void>((resolve) => done.push(resolve)), controller.signal).catch(() => {}),
  )
  await expect(withNetworkSlot(async () => {}, new AbortController().signal)).rejects.toThrow('queue is full')
  controllers.forEach((controller) => controller.abort())
  done.forEach((resolve) => resolve())
  await Promise.all(requests)
})

it('releases a slot when a transport throws synchronously', async () => {
  await expect(
    withNetworkSlot(() => {
      throw new Error('transport failed')
    }, new AbortController().signal),
  ).rejects.toThrow('transport failed')
  expect(await withNetworkSlot(async () => 'recovered', new AbortController().signal)).toBe('recovered')
})
