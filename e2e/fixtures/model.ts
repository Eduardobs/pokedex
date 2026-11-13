/** A deterministic embedded triangle exercises the real GLB loader without remote assets. */
export function triangleModel(): Buffer {
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      buffers: [{ byteLength: 36 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }],
    }),
  )
  const length = Math.ceil(json.length / 4) * 4
  const bytes = Buffer.alloc(28 + length + 36)
  bytes.writeUInt32LE(0x46546c67, 0)
  bytes.writeUInt32LE(2, 4)
  bytes.writeUInt32LE(bytes.length, 8)
  bytes.writeUInt32LE(length, 12)
  bytes.writeUInt32LE(0x4e4f534a, 16)
  bytes.fill(32, 20, 20 + length)
  json.copy(bytes, 20)
  bytes.writeUInt32LE(36, 20 + length)
  bytes.writeUInt32LE(0x004e4942, 24 + length)
  new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).forEach((value, index) =>
    bytes.writeFloatLE(value, 28 + length + index * 4),
  )
  return bytes
}
