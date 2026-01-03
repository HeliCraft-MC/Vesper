import mitt from 'mitt'

export type Events = {
    [eventName: string]: any // Define event types if needed
}

const eventBus = mitt<Events>()

export default eventBus