/** Reuse validated catalog pages with at most four requests in flight. */
export async function fetchCatalogBatches<T>(
  ids: number[],
  fetchPage: (ids: number[], signal: AbortSignal) => Promise<Record<string, T>>,
  signal: AbortSignal,
): Promise<Record<string, T>> {
  const result: Record<string, T> = Object.create(null)
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  try {
    if (signal.aborted) controller.abort()
    for (let start = 0; start < ids.length; start += 160) {
      controller.signal.throwIfAborted()
      const pages = await Promise.all(
        [0, 40, 80, 120]
          .filter((offset) => start + offset < ids.length)
          .map((offset) => fetchPage(ids.slice(start + offset, start + offset + 40), controller.signal)),
      )
      for (const page of pages) Object.assign(result, page)
    }
    signal.throwIfAborted()
    return result
  } finally {
    controller.abort()
    signal.removeEventListener('abort', abort)
  }
}
