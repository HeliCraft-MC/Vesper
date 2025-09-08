// composables/usePlanFetch.ts
import { ofetch } from 'ofetch'
import { useRuntimeConfig } from '#imports'
const config = useRuntimeConfig()

type PlanError = Error & { status?: number; cause?: unknown }

let _client: ReturnType<typeof ofetch.create> | null = null

function getClient () {
    if (_client) return _client

    _client = ofetch.create({
        baseURL: config.public.planApiURL || 'https://analytics.helicraft.ru',
        credentials: 'include',     // шлём куки, если браузер их всё-таки отправляет
        redirect: 'error',          // не следуем за 30x — пусть бросает ошибку
        mode: 'cors',

        // 2xx ответы
        onResponse({ response }) {
            const ct = response.headers.get('content-type') || ''
            // если вдруг прилетела HTML-страница (UI) или ответ помечен как redirected — считаем, что нужна авторизация на Plan
            if (response.redirected || ct.includes('text/html')) {
                const err: PlanError = new Error('PLAN_REDIRECT_OR_HTML')
                err.name = 'PlanAuthRequired'
                err.status = response.status && response.status !== 200 ? response.status : 401
                throw err
            }
        },

        // 4xx/5xx
        onResponseError({ response }) {
            const ct = response?.headers?.get?.('content-type') || ''
            if (ct.includes('text/html')) {
                const err: PlanError = new Error('PLAN_REDIRECT_OR_HTML')
                err.name = 'PlanAuthRequired'
                err.status = response?.status || 401
                throw err
            }
            // остальное пусть упадёт как есть (ofetch уже бросает)
        },

        // сетевые/CORS/redirect:'error' ошибки (fetch-reject)
        onRequestError({ error }) {
            const err: PlanError = new Error('PLAN_NETWORK_OR_REDIRECT_BLOCKED')
            err.name = 'PlanNetworkError'
            err.cause = error
            err.status = 0
            throw err
        }
    })

    return _client
}

export function usePlanFetch<T = any>(endpoint: string, opts: any = {}) {
    return getClient()<T>(endpoint, opts)
}
