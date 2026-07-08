type MaybePromise<T> = T | Promise<T>

export interface ServiceScope<TServices> {
  services: TServices
  dispose?: () => MaybePromise<void>
}

export type ServiceFactoryResult<TServices> = TServices | ServiceScope<TServices>

export type ServiceFactory<TServices> = () => MaybePromise<ServiceFactoryResult<TServices>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isServiceScope<TServices>(value: ServiceFactoryResult<TServices>): value is ServiceScope<TServices> {
  return isRecord(value) && 'services' in value
}

function getDisposable(value: unknown): (() => MaybePromise<void>) | undefined {
  if (!isRecord(value) || typeof value.dispose !== 'function') return undefined
  return value.dispose.bind(value) as () => MaybePromise<void>
}

export function createServiceLifecycle<TServices>(createServices: ServiceFactory<TServices>): {
  createServices(): Promise<TServices>
  dispose(): Promise<void>
} {
  const disposeList: Array<() => MaybePromise<void>> = []

  return {
    async createServices() {
      const value = await createServices()
      if (isServiceScope(value)) {
        if (value.dispose) disposeList.push(value.dispose)
        return value.services
      }

      const dispose = getDisposable(value)
      if (dispose) disposeList.push(dispose)
      return value
    },
    async dispose() {
      for (const dispose of [...disposeList].reverse()) {
        await dispose()
      }
      disposeList.length = 0
    },
  }
}
