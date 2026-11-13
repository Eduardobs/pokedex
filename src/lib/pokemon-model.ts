import { NETWORK } from '../config/app'
import { ApiError, readBoundedJsonResponse } from './api-client'
import { record } from './resource-data'

export const MODEL_LIMITS = {
  bytes: 20 * 1024 * 1024,
  vertices: 1_000_000,
  indices: 3_000_000,
  images: 32,
  pixels: 32 * 1024 * 1024,
} as const
export function resolvePokemonModelUrl(value: string, allowIncomplete = false): string {
  const url = new URL(value)
  if (
    url.origin !== 'https://raw.githubusercontent.com' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (!allowIncomplete && !url.pathname.endsWith('.glb')) ||
    !/^\/Pokemon-3D-api\/assets\/(?:refs\/heads\/)?main\/models\/(?:opt|glb)\/[a-zA-Z0-9/_-]+(?:\.glb)?$/.test(
      url.pathname,
    )
  )
    throw new ApiError('Unsafe model URL.', undefined, 'unsafe-url')
  return url.href
}
const invalid = (): never => {
  throw new ApiError('Invalid or oversized 3D model.', undefined, 'invalid-response')
}
const uint = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max

function imagePixels(bytes: Uint8Array, mime: unknown): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let width = 0,
    height = 0
  if (
    mime === 'image/png' &&
    bytes.length >= 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a
  ) {
    width = view.getUint32(16)
    height = view.getUint32(20)
  } else if (
    mime === 'image/webp' &&
    bytes.length >= 30 &&
    view.getUint32(0) === 0x52494646 &&
    view.getUint32(8) === 0x57454250
  ) {
    const chunk = view.getUint32(12)
    if (chunk === 0x56503858) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16)
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)
    } else if (chunk === 0x5650384c && bytes[20] === 0x2f) {
      const dimensions = view.getUint32(21, true)
      width = (dimensions & 0x3fff) + 1
      height = ((dimensions >>> 14) & 0x3fff) + 1
    } else if (chunk === 0x56503820 && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = view.getUint16(26, true) & 0x3fff
      height = view.getUint16(28, true) & 0x3fff
    }
  } else if (mime === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) return invalid()
      const marker = bytes[offset + 1],
        length = view.getUint16(offset + 2)
      if (length < 2 || offset + 2 + length > bytes.length) return invalid()
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 7) {
        height = view.getUint16(offset + 5)
        width = view.getUint16(offset + 7)
        break
      }
      offset += length + 2
    }
  }
  if (!width || !height || width > 4096 || height > 4096) return invalid()
  return width * height
}

/** Validate declared work and embedded resources before handing bytes to the renderer. */
export async function validatePokemonModel(bytes: Uint8Array): Promise<void> {
  if (bytes.length < 28 || bytes.length > MODEL_LIMITS.bytes) return invalid()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.length ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    return invalid()
  const jsonLength = view.getUint32(12, true),
    binOffset = 20 + jsonLength
  if (jsonLength > 1024 * 1024 || binOffset + 8 > bytes.length || view.getUint32(binOffset + 4, true) !== 0x004e4942)
    return invalid()
  const binLength = view.getUint32(binOffset, true)
  if (binOffset + 8 + binLength !== bytes.length) return invalid()
  const data = record(
    await readBoundedJsonResponse(
      new Response(new TextDecoder().decode(bytes.subarray(20, binOffset)), {
        headers: { 'Content-Type': 'application/json' },
      }),
      1024 * 1024,
    ),
  )
  if (record(data.asset).version !== '2.0') return invalid()
  // Every resource must be embedded; a GLB must not initiate secondary requests.
  const inspect = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (key === 'uri') invalid()
      inspect(child)
    }
  }
  inspect(data)
  const list = (key: string, max: number) => {
    const value = data[key] ?? []
    if (!Array.isArray(value) || value.length > max) return invalid()
    return value.map(record)
  }
  const nodes = list('nodes', 2048),
    meshes = list('meshes', 512)
  list('materials', 256)
  list('textures', MODEL_LIMITS.images)
  const visiting = new Set<number>(),
    heights = new Map<number, number>(),
    parents = new Set<number>()
  const walk = (index: number): number => {
    if (visiting.has(index)) return invalid()
    const cached = heights.get(index)
    if (cached !== undefined) return cached
    visiting.add(index)
    const children = nodes[index].children ?? []
    if (!Array.isArray(children) || children.length > 100) return invalid()
    let height = 0
    for (const child of children) {
      if (!uint(child, nodes.length - 1) || parents.has(child)) return invalid()
      parents.add(child)
      height = Math.max(height, 1 + walk(child))
      if (height > 64) return invalid()
    }
    visiting.delete(index)
    heights.set(index, height)
    return height
  }
  nodes.forEach((_, index) => walk(index))
  const accessors = list('accessors', 4096)
  let vertices = 0,
    indices = 0,
    decodedValues = 0
  const components: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }
  for (const accessor of accessors) {
    if (!uint(accessor.count, MODEL_LIMITS.indices)) return invalid()
    if (typeof accessor.type !== 'string' || !Object.hasOwn(components, accessor.type)) return invalid()
    decodedValues += accessor.count * components[accessor.type]
    if (decodedValues > 8_000_000) return invalid()
    if (accessor.type === 'SCALAR') indices += accessor.count
    else vertices += accessor.count
  }
  if (vertices > MODEL_LIMITS.vertices * 8 || indices > MODEL_LIMITS.indices) return invalid()
  const meshWork = meshes.map((mesh) => {
    if (!Array.isArray(mesh.primitives) || mesh.primitives.length > 100) return invalid()
    return mesh.primitives.reduce((sum: number, value: unknown) => {
      const primitive = record(value),
        position = record(primitive.attributes).POSITION
      if (!uint(position, accessors.length - 1)) return invalid()
      const count = accessors[position].count
      if (!uint(count, MODEL_LIMITS.vertices)) return invalid()
      return sum + count
    }, 0)
  })
  let renderedVertices = 0
  for (const node of nodes) {
    if (node.mesh === undefined) continue
    if (!uint(node.mesh, meshes.length - 1)) return invalid()
    renderedVertices += meshWork[node.mesh]
    if (renderedVertices > MODEL_LIMITS.vertices) return invalid()
  }
  const buffers = list('buffers', 1)
  if (buffers.length !== 1 || !uint(buffers[0].byteLength, binLength) || binLength - buffers[0].byteLength > 3)
    return invalid()
  const views = list('bufferViews', 4096)
  for (const entry of views) {
    if (
      entry.buffer !== 0 ||
      !uint(entry.byteOffset ?? 0, binLength) ||
      !uint(entry.byteLength, binLength) ||
      Number(entry.byteOffset ?? 0) + entry.byteLength > binLength
    )
      return invalid()
  }
  let pixels = 0
  for (const image of list('images', MODEL_LIMITS.images)) {
    if (!uint(image.bufferView, views.length - 1)) return invalid()
    const entry = views[image.bufferView],
      offset = binOffset + 8 + Number(entry.byteOffset ?? 0)
    pixels += imagePixels(bytes.subarray(offset, offset + Number(entry.byteLength)), image.mimeType)
    if (pixels > MODEL_LIMITS.pixels) return invalid()
  }
}

export async function fetchPokemonModel(src: string, signal: AbortSignal): Promise<Blob> {
  const url = resolvePokemonModelUrl(src)
  signal.throwIfAborted()
  const controller = new AbortController()
  const abort = () => controller.abort(signal.reason)
  signal.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(
    () => controller.abort(new DOMException('Model request timed out.', 'TimeoutError')),
    NETWORK.requestTimeoutMs,
  )
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new ApiError('Model request failed.', response.status)
    }
    if (Number(response.headers.get('content-length')) > MODEL_LIMITS.bytes) {
      await response.body?.cancel()
      return invalid()
    }
    const reader = response.body?.getReader()
    if (!reader) return invalid()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MODEL_LIMITS.bytes) {
        await reader.cancel()
        return invalid()
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    controller.signal.throwIfAborted()
    await validatePokemonModel(bytes)
    controller.signal.throwIfAborted()
    return new Blob([bytes], { type: 'model/gltf-binary' })
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}
