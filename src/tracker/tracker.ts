// @ts-ignore
import { Server } from 'bittorrent-tracker';
import { TrackerAnnounceData, TrackerParams } from './types';
import { settings } from '../settings';

export const trackerServer = new Server({
  udp: true, // enable udp server? [default=true]
  http: true, // enable http server? [default=true]
  ws: true, // enable websocket server? [default=true]
  stats: false, // enable web-based statistics? [default=true]
  trustProxy: false, // enable trusting x-forwarded-for header for remote IP [default=false]
  interval: 3 * 60 * 1000,
  filter: function (infoHash: string, params: TrackerParams, cb: (arg0: Error | null) => void) {
    console.log(`tracker announced from ${params.addr} with correct token ${params.token === process.env.TRACKER_TOKEN}`);
    if (settings.trackerToken && params.token === settings.trackerToken) {
      const announceData: TrackerAnnounceData = {
        infoHash,
        ip: params.ip,
        port: params.port,
        addr: params.addr,
        token: params.token,
      }
      this.emit('announce', announceData);
      cb(null)
    } else {
      cb(new Error('unauthorised'))
    }
  }
})

trackerServer.on('error', function (err: { message: any; }) {
  console.log('tracker server error', err.message)
})

trackerServer.on('warning', function (err: { message: any; }) {
  console.log('tracker server warning',err.message)
})

// trackerServer.on('listening', function () {
//   // fired when all requested servers are listening
//
//   // HTTP
//   const httpAddr = trackerServer.http.address()
//   const httpHost = httpAddr.address !== '::' ? httpAddr.address : 'localhost'
//   const httpPort = httpAddr.port
//   console.log(`HTTP tracker: http://${httpHost}:${httpPort}/announce`)
//
//   // UDP
//   const udpAddr = trackerServer.udp.address()
//   const udpHost = udpAddr.address
//   const udpPort = udpAddr.port
//   console.log(`UDP tracker: udp://${udpHost}:${udpPort}`)
//
//   // WS
//   const wsAddr = trackerServer.ws.address()
//   const wsHost = wsAddr.address !== '::' ? wsAddr.address : 'localhost'
//   const wsPort = wsAddr.port
//   console.log(`WebSocket tracker: ws://${wsHost}:${wsPort}`)
//
// })


// start tracker server listening! Use 0 to listen on a random free port.
const port = settings.trackerPort;
trackerServer.listen(port, () => {
  console.log(`tracker listening on port ${port}`)
})

// trackerServer.on('start', function (addr: string) {
//   console.log('got start message from ' + addr)
// })
// trackerServer.on('complete', function (addr: string) {
//   console.log('got complete message from ' + addr)
// })
// trackerServer.on('update', function (addr: string) {
//   console.log('got update message from ' + addr)
// })
// trackerServer.on('stop', function (addr: string) {
//   console.log('got stop message from ' + addr)
// })
// trackerServer.on('announce', function (data: TrackerAnnounceData) {
//   console.log('got announce message', data)
// })

// // get info hashes for all torrents in the tracker server
// Object.keys(trackerServer.torrents)

// // get the number of seeders for a particular torrent
// trackerServer.torrents[infoHash].complete

// // get the number of leechers for a particular torrent
// trackerServer.torrents[infoHash].incomplete

// // get the peers who are in a particular torrent swarm
// trackerServer.torrents[infoHash].peers
