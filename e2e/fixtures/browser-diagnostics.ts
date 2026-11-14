import { test as base } from '@playwright/test'

export const test = base.extend<{ browserDiagnostics: void }>({
  browserDiagnostics: [
    async ({ page }, use, testInfo) => {
      const messages: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning')
          messages.push(`${message.type()}: ${message.text()}`)
      })
      page.on('pageerror', (error) => messages.push(`pageerror: ${error.stack ?? error.message}`))
      page.on('requestfailed', (request) =>
        messages.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`),
      )
      await use()
      if (testInfo.status !== testInfo.expectedStatus) {
        const body = messages.join('\n') || 'No browser errors or failed requests recorded.'
        console.error(body)
        await testInfo.attach('browser-diagnostics', { body, contentType: 'text/plain' })
      }
    },
    { auto: true },
  ],
})
