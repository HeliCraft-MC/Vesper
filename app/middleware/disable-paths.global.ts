export default defineNuxtRouteMiddleware((to) => {
    const disabledPaths = []
    if (
        process.env.VESPER_DISABLE_STATE_LOGIC
            ? process.env.VESPER_DISABLE_STATE_LOGIC === 'true' : true)
        disabledPaths.push("/states");

    if (disabledPaths.some(p => to.path.startsWith(p))) {
        return abortNavigation(
            createError({
                statusCode: 404,
                statusMessage: 'Page not found'
            })
        )
    }
})