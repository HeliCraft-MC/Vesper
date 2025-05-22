import { useRuntimeConfig } from '#imports'
import { ofetch } from 'ofetch'

export function usePlanFetch(endpoint: string, opts: any = {}) {
    const baseURL = '/plan-api'
    return ofetch(endpoint, { baseURL, credentials: 'include', ...opts })
}
