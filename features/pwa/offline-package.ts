export type OfflinePackageScope = "core" | "full"

export type OfflinePackageResult = {
  scope: OfflinePackageScope
  routeCount: number
  resourceCount: number
}

type OfflinePackageWorkerMessage =
  | ({ type: "OFFLINE_PACKAGE_READY" } & OfflinePackageResult)
  | { type: "OFFLINE_PACKAGE_ERROR"; message: string }

const OFFLINE_PACKAGE_TIMEOUT_MS = 180_000

let corePreparation: Promise<OfflinePackageResult> | null = null
let fullPreparation: Promise<OfflinePackageResult> | null = null

async function sendPreparationRequest(
  scope: OfflinePackageScope,
  registration?: ServiceWorkerRegistration,
): Promise<OfflinePackageResult> {
  const readyRegistration = registration ?? await navigator.serviceWorker.ready
  const worker = readyRegistration.active

  if (!worker) {
    throw new Error("The active service worker is unavailable.")
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error("Offline package preparation timed out."))
    }, OFFLINE_PACKAGE_TIMEOUT_MS)

    const finish = () => {
      window.clearTimeout(timeout)
      channel.port1.close()
    }

    channel.port1.onmessage = (event: MessageEvent<OfflinePackageWorkerMessage>) => {
      const message = event.data
      finish()

      if (message?.type === "OFFLINE_PACKAGE_READY") {
        resolve({
          scope: message.scope,
          routeCount: message.routeCount,
          resourceCount: message.resourceCount,
        })
        return
      }

      reject(new Error(message?.message || "Offline package preparation failed."))
    }
    channel.port1.onmessageerror = () => {
      finish()
      reject(new Error("The service worker returned an invalid offline package response."))
    }

    worker.postMessage(
      { type: "PREPARE_OFFLINE_PACKAGE", scope },
      [channel.port2],
    )
  })
}

export function prepareOfflinePackage(
  scope: OfflinePackageScope,
  registration?: ServiceWorkerRegistration,
): Promise<OfflinePackageResult> {
  if (scope === "core") {
    if (fullPreparation) return fullPreparation
    if (corePreparation) return corePreparation

    corePreparation = sendPreparationRequest(scope, registration).catch((error) => {
      corePreparation = null
      throw error
    })
    return corePreparation
  }

  if (fullPreparation) return fullPreparation
  fullPreparation = (async () => {
    if (corePreparation) {
      await corePreparation.catch(() => undefined)
    }
    return sendPreparationRequest(scope, registration)
  })().catch((error) => {
    fullPreparation = null
    throw error
  })

  return fullPreparation
}
