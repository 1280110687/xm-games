// XM Games offline adapter: no presence, account or messaging requests.
export class LobbyIndicator {
  constructor(..._args: unknown[]) {}
  async init() {}
  getMessagingClient() { return null }
  setTableId(_tableId?: string) {}
  scheduleLeave(_delay: number) {}
  async stop() {}
}
