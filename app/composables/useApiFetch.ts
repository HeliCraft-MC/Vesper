// composables/useApiFetch.ts
import { defu } from 'defu'
import type {UseFetchOptions} from "#app";

export function useApiFetch<T = any> (
    path: string,
    options: UseFetchOptions<T> = {}
) {
    const config = useRuntimeConfig()
    const { token } = useAuth()                              // token.value → Bearer

    const defaults: UseFetchOptions<T> = {
        baseURL: config.public.backendURL,
        credentials: 'include',               // для куки refreshToken
        headers: token.value
            ? { Authorization: `Bearer ${token.value}` }
            : {},
        watch: false
    }

    return useFetch(path, defu(options, defaults))
}
