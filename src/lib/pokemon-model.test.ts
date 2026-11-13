import { afterEach, expect, it, vi } from 'vitest'
import { fetchPokemonModel, MODEL_LIMITS, resolvePokemonModelUrl, validatePokemonModel } from './pokemon-model'
import { NETWORK } from '../config/app'

const url = 'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/25.glb'
const base = { asset: { version: '2.0' }, buffers: [{ byteLength: 4 }] }
function glb(data: object = base, binary: Uint8Array = new Uint8Array(4)) {
  const json = new TextEncoder().encode(JSON.stringify(data))
  const length = Math.ceil(json.length / 4) * 4
  const bytes = new Uint8Array(28 + length + binary.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, bytes.length, true)
  view.setUint32(12, length, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.fill(32, 20, 20 + length)
  bytes.set(json, 20)
  view.setUint32(20 + length, binary.length, true)
  view.setUint32(24 + length, 0x004e4942, true)
  bytes.set(binary, 28 + length)
  return bytes
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
it('accepts only the exact HTTPS model repository and rejects external embedded resources', async () => {
  expect(resolvePokemonModelUrl(url)).toBe(url)
  for (const input of [
    url.replace('https:', 'http:'),
    url.replace('Pokemon-3D-api', 'attacker'),
    `${url}?track=1`,
    `${url}#hash`,
    url.replace('raw.', 'user:pass@raw.'),
  ])
    expect(() => resolvePokemonModelUrl(input)).toThrow()
  await expect(validatePokemonModel(glb())).resolves.toBeUndefined()
  for (const data of [
    { ...base, images: [{ uri: 'https://evil.example/texture.png' }] },
    { ...base, accessors: [{ count: MODEL_LIMITS.indices + 1 }] },
    { ...base, accessors: [{ type: 'MAT4', count: 750000 }] },
    { ...base, buffers: [{ byteLength: 100 }] },
    { ...base, bufferViews: [{ buffer: 0, byteOffset: 4, byteLength: 4 }] },
    { ...base, nodes: Array(2049).fill({}) },
    { ...base, asset: { version: '1.0' } },
  ])
    await expect(validatePokemonModel(glb(data))).rejects.toMatchObject({ code: 'invalid-response' })
  await expect(validatePokemonModel(new Uint8Array(4))).rejects.toThrow()
  const invalid = glb()
  invalid[0] = 0
  await expect(validatePokemonModel(invalid)).rejects.toThrow()
})
it('bounds embedded texture dimensions before decoding', async () => {
  const png = new Uint8Array(24),
    view = new DataView(png.buffer)
  view.setUint32(0, 0x89504e47)
  view.setUint32(4, 0x0d0a1a0a)
  view.setUint32(16, 64)
  view.setUint32(20, 64)
  const data = {
    ...base,
    buffers: [{ byteLength: 24 }],
    bufferViews: [{ buffer: 0, byteLength: 24 }],
    images: [{ bufferView: 0, mimeType: 'image/png' }],
  }
  await expect(validatePokemonModel(glb(data, png))).resolves.toBeUndefined()
  view.setUint32(16, 65535)
  await expect(validatePokemonModel(glb(data, png))).rejects.toThrow()
  await expect(
    validatePokemonModel(glb({ ...data, images: [{ bufferView: 5, mimeType: 'image/png' }] }, png)),
  ).rejects.toThrow()
})
it('downloads a validated blob with no credentials and no redirects', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(glb()))
  vi.stubGlobal('fetch', fetch)
  const blob = await fetchPokemonModel(url, new AbortController().signal)
  expect(blob.type).toBe('model/gltf-binary')
  expect(fetch).toHaveBeenCalledWith(
    url,
    expect.objectContaining({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' }),
  )
})
it('rejects oversized declared and streamed bodies and HTTP failures', async () => {
  const cancel = vi.fn()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MODEL_LIMITS.bytes + 1))
    },
    cancel,
  })
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('x', { headers: { 'content-length': String(MODEL_LIMITS.bytes + 1) } }))
      .mockResolvedValueOnce(new Response(stream))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(null)),
  )
  for (let i = 0; i < 4; i++) await expect(fetchPokemonModel(url, new AbortController().signal)).rejects.toThrow()
  expect(cancel).toHaveBeenCalled()
})
it('aborts downloads on timeout, consumer departure and already aborted signals', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) =>
        init.signal.addEventListener('abort', () => reject(init.signal.reason)),
      ),
  )
  vi.stubGlobal('fetch', fetch)
  const consumer = new AbortController()
  const pending = fetchPokemonModel(url, consumer.signal)
  const timeout = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
  await vi.advanceTimersByTimeAsync(NETWORK.requestTimeoutMs)
  await timeout
  const second = fetchPokemonModel(url, consumer.signal)
  const aborted = expect(second).rejects.toMatchObject({ name: 'AbortError' })
  consumer.abort()
  await aborted
  await expect(fetchPokemonModel(url, consumer.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('accepts bounded mesh instances and rejects scene cycles, repeated children and amplified geometry', async () => {
  const mesh = { primitives: [{ attributes: { POSITION: 0 } }] }
  const valid = { ...base, accessors: [{ type: 'VEC3', count: 3 }], meshes: [mesh], nodes: [{ mesh: 0 }] }
  await expect(validatePokemonModel(glb(valid))).resolves.toBeUndefined()
  const invalid = [
    { ...valid, meshes: [{}] },
    { ...valid, meshes: [{ primitives: Array(101).fill(mesh.primitives[0]) }] },
    { ...valid, meshes: [{ primitives: [{ attributes: { POSITION: 4 } }] }] },
    { ...valid, nodes: [{ mesh: 5 }] },
    { ...valid, nodes: [{ children: 'invalid' }] },
    { ...valid, nodes: [{ children: [0] }] },
    { ...valid, nodes: [{ children: [1, 1] }, {}] },
    { ...valid, nodes: [{ children: [2] }] },
    { ...valid, nodes: Array.from({ length: 66 }, (_, i) => (i === 65 ? {} : { children: [i + 1] })) },
    { ...valid, accessors: [{ type: 'VEC3', count: 750000 }], nodes: [{ mesh: 0 }, { mesh: 0 }] },
    { ...valid, accessors: Array(9).fill({ type: 'VEC3', count: 1000000 }) },
    {
      ...valid,
      accessors: [
        { type: 'SCALAR', count: 2000000 },
        { type: 'SCALAR', count: 2000000 },
      ],
    },
  ]
  for (const data of invalid) await expect(validatePokemonModel(glb(data))).rejects.toThrow()
})

it('validates WebP and JPEG dimensions and limits the aggregate texture allocation', async () => {
  const imageModel = (bytes: Uint8Array, mimeType: string, count = 1) =>
    glb(
      {
        ...base,
        buffers: [{ byteLength: bytes.length }],
        bufferViews: [{ buffer: 0, byteLength: bytes.length }],
        images: Array.from({ length: count }, () => ({ bufferView: 0, mimeType })),
      },
      bytes,
    )
  for (const kind of ['extended', 'lossless', 'lossy']) {
    const bytes = new Uint8Array(32),
      view = new DataView(bytes.buffer)
    view.setUint32(0, 0x52494646)
    view.setUint32(8, 0x57454250)
    if (kind === 'extended') {
      view.setUint32(12, 0x56503858)
      bytes[24] = 63
      bytes[27] = 63
    } else if (kind === 'lossless') {
      view.setUint32(12, 0x5650384c)
      bytes[20] = 0x2f
      view.setUint32(21, 63 | (63 << 14), true)
    } else {
      view.setUint32(12, 0x56503820)
      bytes[23] = 0x9d
      bytes[24] = 1
      bytes[25] = 0x2a
      view.setUint16(26, 64, true)
      view.setUint16(28, 64, true)
    }
    await expect(validatePokemonModel(imageModel(bytes, 'image/webp'))).resolves.toBeUndefined()
  }
  const jpeg = new Uint8Array(24),
    view = new DataView(jpeg.buffer)
  jpeg.set([0xff, 0xd8, 0xff, 0xc0])
  view.setUint16(4, 17)
  view.setUint16(7, 64)
  view.setUint16(9, 64)
  await expect(validatePokemonModel(imageModel(jpeg, 'image/jpeg'))).resolves.toBeUndefined()
  view.setUint16(4, 0)
  await expect(validatePokemonModel(imageModel(jpeg, 'image/jpeg'))).rejects.toThrow()
  await expect(validatePokemonModel(imageModel(new Uint8Array(24), 'image/webp'))).rejects.toThrow()
  const png = new Uint8Array(24),
    pngView = new DataView(png.buffer)
  pngView.setUint32(0, 0x89504e47)
  pngView.setUint32(4, 0x0d0a1a0a)
  pngView.setUint32(16, 4096)
  pngView.setUint32(20, 4096)
  await expect(validatePokemonModel(imageModel(png, 'image/png', 3))).rejects.toThrow()
})
