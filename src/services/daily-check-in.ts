import { kvDataStorage } from './kv-data-storage';
import { notificationService } from './notification';

export async function dailyCheckIn() {
  const lastCheckIn = kvDataStorage.get<number>('lastCheckIn');
  if (lastCheckIn && Date.now() - lastCheckIn < 1000 * 60 * 60 * 23) {
    return;
  }

  //get stats
  const lastCheckInMessage = new Date(lastCheckIn || Date.now()).toLocaleString('lt-LT');
  const numPortsChanged = kvDataStorage.get<number>('numPortsChanged') || 0;
  const numRuns = kvDataStorage.get<number>('numRuns') || 0;
  const isServiceRunning = kvDataStorage.get<boolean>('isServiceRunning') || false;
  const lastRun = kvDataStorage.get<number>('lastRun');
  let lastRunMessage = 'never';
  if (lastRun) {
    lastRunMessage = new Date(lastRun).toLocaleString('lt-LT');
  }

  //reset data
  await kvDataStorage.set({ lastCheckIn: Date.now() , numPortsChanged: 0, numRuns: 0 });

  const message = `Daily check-in. Last check-in: ${lastCheckInMessage}. Number of ports changed: ${numPortsChanged}. Number of checks: ${numRuns}. Service running: ${isServiceRunning}. Last run: ${lastRunMessage}`;
  await notificationService.sendNotification(message);
}
