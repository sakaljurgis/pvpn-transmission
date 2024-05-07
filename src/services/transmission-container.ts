import { DockerContainer } from './docker';
import { settings } from '../settings';
import { kvDataStorage } from './kv-data-storage';
import { notificationService } from './notification';

export class TransmissionContainer extends DockerContainer {
  constructor() {
    super(
      settings.dockerTransmission.service,
      settings.dockerTransmission.cwd,
      settings.dockerTransmission.serviceName
    );
  }

  async downTransmission(reason: string) {
    console.log(reason);

    await kvDataStorage.set({ isServiceRunning: false });
    await notificationService.sendNotification(reason, true);

    return await this.down();
  }
}

export const transmissionContainer = new TransmissionContainer();
