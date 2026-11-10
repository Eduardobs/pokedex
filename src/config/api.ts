import defaults from './api-defaults.json' with { type: 'json' }

type ApiEnvironment = {
  VITE_POKEAPI_REST_URL?: string
  VITE_POKEAPI_GRAPHQL_URL?: string
}

function endpoint(value: string | undefined, fallback: string, name: string): string {
  const url = new URL(value?.trim() || fallback)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must be an absolute HTTPS URL without credentials, query, or fragment`)
  }
  return url.href.replace(/\/+$/, '')
}

export function getApiConfig(env: ApiEnvironment) {
  const restUrl = endpoint(env.VITE_POKEAPI_REST_URL, defaults.restUrl, 'VITE_POKEAPI_REST_URL')
  const graphqlUrl = endpoint(env.VITE_POKEAPI_GRAPHQL_URL, defaults.graphqlUrl, 'VITE_POKEAPI_GRAPHQL_URL')
  return { restUrl, restOrigin: new URL(restUrl).origin, graphqlUrl, graphqlOrigin: new URL(graphqlUrl).origin }
}
