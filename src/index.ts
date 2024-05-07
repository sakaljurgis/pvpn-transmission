import { setPortFlow } from './set-port-flow';
import { settings } from './settings';
import { trackerServer } from './tracker/tracker';
import { kvDataStorage } from './services/kv-data-storage';
import { onTrackerAnnounce } from './tracker-announce-flow';

const isWorker = process.argv[2] === 'worker';

if (isWorker) {
  trackerServer.on('announce', onTrackerAnnounce);

  const lastRun = kvDataStorage.get<number>('lastRun') || 0;
  const sinceLastRun = Date.now() - lastRun;
  if (sinceLastRun > settings.updateIntervalMs) {
    console.log(`Starting worker, check now`);
    worker();
  } else {
    console.log(`Starting worker, first check in ${(settings.updateIntervalMs - sinceLastRun)/1000}s`);
    setTimeout(worker, settings.updateIntervalMs - sinceLastRun);
  }

} else {
  setPortFlow()
    .then(() => console.log('All done'))
    .catch(console.error);
}

//todo - store some state in a file (in case of crash/restart)?
function worker() {
  setPortFlow()
    .then(() => console.log('All done'))
    .catch(console.error)
    .finally(() => setTimeout(worker, settings.updateIntervalMs));
}
