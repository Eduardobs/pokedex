import { loadEnv } from 'vite'
import { getApiConfig } from '../../src/config/api'

const api = getApiConfig({ ...loadEnv('development', process.cwd(), 'VITE_'), ...process.env })
export const API_BASE_URL = api.restUrl
export const GRAPHQL_API_URL = api.graphqlUrl
export const API_BASE_PATH = new URL(API_BASE_URL).pathname.replace(/\/+$/, '')
