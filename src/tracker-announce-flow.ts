import { TrackerAnnounceData } from './tracker/types';
import { settings } from './settings';
import { transmissionContainer } from './services/transmission-container';
import { kvDataStorage } from './services/kv-data-storage';
import { notificationService } from './services/notification';

export const onTrackerAnnounce = async (data: TrackerAnnounceData) => {
  //check if ip is allowed
  if (settings.disallowedIntIps.some((ip) => data.ip.includes(ip)) || settings.disallowedExtIps.some((ip) => data.ip.includes(ip))) {
    console.log(`Announce from disallowed ip ${data.ip}`);
    const transmissionContainerStatus = await transmissionContainer.getState() || { state: 'unknown' };
    if (transmissionContainerStatus.state !== 'running') {
      const lastNotRunningButAnnouncedNotification = kvDataStorage.get<number>('lastNotRunningButAnnouncedNotification') || 0;
      if (Date.now() - lastNotRunningButAnnouncedNotification < 60 * 60 * 1000) {
        return;
      }
      await notificationService.sendNotification(`Announce from disallowed ip ${data.ip}, but transmission is not running`, true);
      await kvDataStorage.set({ lastNotRunningButAnnouncedNotification: Date.now() });
      return;
    }
    await transmissionContainer.downTransmission(`Shutting down: announce from disallowed ip ${data.ip}`);
    return;
  }

  //check if ip matches external ip
  const externalIp = kvDataStorage.get<string>('externalIp') || '0.0.0.0';
  if (data.ip !== externalIp) {
    const ipMismatchCount = kvDataStorage.get<number>('ipMismatchCount') || 0;
    if (ipMismatchCount > 2) {
      console.log(`Announce from ip ${data.ip} but external ip is ${externalIp}`);
      await transmissionContainer.downTransmission(`Shutting down: announce from ip ${data.ip} but external ip is ${externalIp}`);
    }
    await kvDataStorage.set({ ipMismatchCount: ipMismatchCount + 1 });

    return;
  }
  await kvDataStorage.set({ ipMismatchCount: 0 });
};
