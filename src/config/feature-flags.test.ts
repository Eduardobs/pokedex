import { describe, expect, it } from 'vitest'
import { FEATURE_FLAGS, featureFlag } from './feature-flags'

describe('feature flags', () => {
  it('enables the MapGenie integration by default', () => {
    expect(FEATURE_FLAGS).toEqual({
      mapGenieIntegration: true,
    })
  })

  it('only disables a feature for an explicit false value', () => {
    expect(featureFlag(true, 'false')).toBe(false)
    expect(featureFlag(true, ' FALSE ')).toBe(false)
    expect(featureFlag(true, undefined)).toBe(true)
    expect(featureFlag(false, undefined)).toBe(false)
    expect(featureFlag(false, 'true')).toBe(true)
  })
})
