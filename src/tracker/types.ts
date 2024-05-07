export type TrackerParams = {
  token: string,
  info_hash: string,
  peer_id: string,
  port: number,
  uploaded: string, // string number bytes
  downloaded: string, // string number bytes
  left: number,
  corrupt?: string, // string number bytes
  numwant: number,
  key: string,
  event?: string, // started, completed, stopped
  compact: number,
  no_peer_id?: string, // "1" or "0"
  supportcrypto: string, // "1" or "0"
  redundant?: string, // "1" or "0"
  type: string, // http, udp, ws
  action: number, // 1?
  ip: string,
  addr: string, // ip:port
  headers: {
    host: string,
    "user-agent": string,
    accept?: string,
    "accept-encoding": string,
    connection?: string,
  }
}

export type TrackerAnnounceData = {
  infoHash: string,
  ip: string,
  port: number,
  addr: string,
  token: string,
}
