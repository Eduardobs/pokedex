import { describe, expect, it } from 'vitest'
import { RESOURCE_COLLECTION_COUNT } from './resource-summary'
import { allResources } from './resources'

describe('resource summary', () => {
  it('keeps the lightweight home-page count in sync with the registry', () => {
    expect(RESOURCE_COLLECTION_COUNT).toBe(allResources.length)
  })
})
