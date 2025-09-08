import { ofetch } from 'ofetch'

const planFetch = ofetch.create({
    baseURL: '/plan-api',
    credentials: 'include',

    //no redirect
    redirect: 'error',

    onResponse({ response }) {
        const ct = response.headers.get('content-type') || ''

        if (response.redirected || ct.includes('text/html')) {
            const err: any = new Error('PLAN_REDIRECT_OR_HTML')
            err.name = 'PlanAuthRequired'
            err.status = 401
            throw err
        }
    }
})

export function usePlanFetch(endpoint: string, opts: any = {}) {
    return planFetch(endpoint, opts)
}
