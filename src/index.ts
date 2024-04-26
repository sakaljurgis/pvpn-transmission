import { setPortFlow } from './set-port-flow';
import { settings } from './settings';

const isWorker = process.argv[2] === 'worker';

if (isWorker) {
  //initial timeout is in case of a crash to not flood everything
  console.log(`Starting worker, first check in ${settings.updateIntervalMs/1000}s`);
  setTimeout(worker, settings.updateIntervalMs);
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
