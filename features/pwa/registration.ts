let registrationPromise: Promise<ServiceWorkerRegistration> | null = null

// Shared by background warmup and explicit install intent. Registering can start
// substantial install work, so ordinary page loads must call this only when idle.
export function ensurePwaRegistration(): Promise<ServiceWorkerRegistration> {
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).then(() => navigator.serviceWorker.ready).catch(error => {
      registrationPromise = null
      throw error
    })
  }
  return registrationPromise
}
