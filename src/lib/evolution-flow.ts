import type { EvolutionNode } from '../types'

export type FlowBox = { x: number; y: number; width: number; height: number }
export type EvolutionFlowNode = {
  key: string
  parentKey?: string
  parentName?: string
  depth: number
  node: EvolutionNode
  box: FlowBox
  label?: FlowBox
}
export type EvolutionFlowEdge = { from: string; to: string; path: string }
export type EvolutionFlowLayout = {
  nodes: EvolutionFlowNode[]
  edges: EvolutionFlowEdge[]
  width: number
  height: number
  vertical: boolean
}
export type FlowMeasurements = Record<string, { node?: number; label?: number }>

export function layoutEvolutionFlow(
  root: EvolutionNode,
  options: { vertical: boolean; width: number; measurements?: FlowMeasurements },
): EvolutionFlowLayout {
  const { vertical, measurements = {} } = options
  const nodes: EvolutionFlowNode[] = [],
    edges: EvolutionFlowEdge[] = []
  const margin = 24
  const nodeWidth = vertical ? Math.min(156, options.width - 64) : 166
  const labelWidth = vertical ? Math.min(220, options.width - 56) : 174
  const size = (key: string) => ({ height: measurements[key]?.node || 150, label: measurements[key]?.label || 84 })
  if (vertical) {
    const place = (
      node: EvolutionNode,
      key: string,
      depth: number,
      top: number,
      parent?: EvolutionFlowNode,
    ): number => {
      const measured = size(key)
      const center = options.width / 2 + Math.min(depth, 2) * 4
      const label = parent
        ? { x: center - labelWidth / 2, y: top, width: labelWidth, height: measured.label }
        : undefined
      const box = {
        x: center - nodeWidth / 2,
        y: top + (label ? label.height + 26 : 0),
        width: nodeWidth,
        height: measured.height,
      }
      const placed = { key, parentKey: parent?.key, parentName: parent?.node.species.name, depth, node, box, label }
      nodes.push(placed)
      if (parent && label) {
        const sx = parent.box.x + parent.box.width / 2,
          sy = parent.box.y + parent.box.height
        const tx = center,
          ty = box.y,
          ly = label.y + label.height / 2
        const rail = 12 + Math.min(parent.depth, 3) * 9
        const path =
          parent.node.evolves_to.length > 1
            ? `M ${sx} ${sy} V ${sy + 18} H ${rail} V ${ly} H ${tx} V ${ty}`
            : `M ${sx} ${sy} V ${ly} H ${tx} V ${ty}`
        edges.push({ from: parent.key, to: key, path })
      }
      let bottom = box.y + box.height
      for (const [index, child] of node.evolves_to.entries()) {
        bottom = place(child, `${key}.${index}`, depth + 1, bottom + 42, placed)
      }
      return bottom
    }
    const bottom = place(root, '0', 0, margin)
    return { nodes, edges, width: options.width, height: bottom + margin, vertical }
  }
  const spans = new Map<string, number>()
  const measure = (node: EvolutionNode, key: string): number => {
    const childSpans = node.evolves_to.map((child, index) => measure(child, `${key}.${index}`))
    const measured = size(key)
    const span = Math.max(
      measured.height,
      key === '0' ? 0 : measured.label,
      childSpans.reduce((sum, value) => sum + value, 0) + Math.max(0, childSpans.length - 1) * 32,
    )
    spans.set(key, span)
    return span
  }
  const total = measure(root, '0')
  const place = (node: EvolutionNode, key: string, depth: number, top: number, parent?: EvolutionFlowNode) => {
    const measured = size(key),
      span = spans.get(key)!
    const center = top + span / 2
    const box = {
      x: margin + depth * (nodeWidth + 244),
      y: center - measured.height / 2,
      width: nodeWidth,
      height: measured.height,
    }
    const label = parent
      ? { x: parent.box.x + nodeWidth + 46, y: center - measured.label / 2, width: labelWidth, height: measured.label }
      : undefined
    const placed = { key, parentKey: parent?.key, parentName: parent?.node.species.name, depth, node, box, label }
    nodes.push(placed)
    if (parent) {
      const sx = parent.box.x + parent.box.width,
        sy = parent.box.y + parent.box.height / 2
      edges.push({ from: parent.key, to: key, path: `M ${sx} ${sy} H ${sx + 24} V ${center} H ${box.x}` })
    }
    const childrenHeight =
      node.evolves_to.reduce((sum, _, index) => sum + spans.get(`${key}.${index}`)!, 0) +
      Math.max(0, node.evolves_to.length - 1) * 32
    let cursor = center - childrenHeight / 2
    node.evolves_to.forEach((child, index) => {
      place(child, `${key}.${index}`, depth + 1, cursor, placed)
      cursor += spans.get(`${key}.${index}`)! + 32
    })
  }
  place(root, '0', 0, margin)
  return {
    nodes,
    edges,
    width: Math.max(...nodes.map(({ box }) => box.x + box.width)) + margin,
    height: total + margin * 2,
    vertical,
  }
}
