import { Transmission } from './transmission';
import { DockerContainer } from './docker';
import { settings } from './settings';
import { notificationService } from './notification';
import { kvDataStorage } from './kv-data-storage';
import { dailyCheckIn } from './check-in';

async function downTransmission(transmissionContainer: DockerContainer, reason: string) {
  console.log(reason);

  await kvDataStorage.set({ isServiceRunning: false });
  await notificationService.sendNotification(reason, true);
  return await transmissionContainer.down();
}

export async function setPortFlow() {
  const transmissionClient = new Transmission(settings.transmission);
  const transmissionContainer = new DockerContainer(
    settings.dockerTransmission.service,
    settings.dockerTransmission.cwd,
    settings.dockerTransmission.serviceName
  );
  const gluetunContainer = new DockerContainer(
    settings.dockerGluetun.service,
    settings.dockerGluetun.cwd,
    settings.dockerGluetun.serviceName
  );

  try {
    await doSetPortFlow(transmissionClient, transmissionContainer, gluetunContainer);
  } catch (e) {
    console.error('Error in set port flow', e);
    await downTransmission(transmissionContainer, `Shutting down: error in set port flow.`);
  }
  await dailyCheckIn();
}

async function doSetPortFlow(transmissionClient: Transmission, transmissionContainer: DockerContainer, gluetunContainer: DockerContainer) {
  console.log('Starting set port flow');

  const containerState = await transmissionContainer.getState();
  if (containerState?.state !== 'running') {
    console.log('Transmission service is not running');
    await kvDataStorage.set({ isServiceRunning: false });
    return;
  }
  const numRuns = kvDataStorage.get<number>('numRuns') || 0;
  await kvDataStorage.set({ isServiceRunning: true, numRuns: numRuns + 1, lastRun: Date.now() });

  console.log(`Gathering info`);
  const port = await transmissionClient.getPort();
  console.log(`Port: ${port}`);
  const portOpen = await transmissionClient.testPortIfOpen();
  console.log(`Port is open: ${portOpen}`);
  const defaultInterface = await transmissionContainer.getDefaultInterface();
  console.log(`Default interface: ${defaultInterface?.interface} Internal ip: ${defaultInterface?.ip}`);
  const ipInfo = await transmissionContainer.getIpInfo();
  console.log(`External ip: ${ipInfo?.ip} Country: ${ipInfo?.country}`);

  if (!defaultInterface || !ipInfo) {
    return await downTransmission(
      transmissionContainer,
      `Shutting down: defaultInterface: ${!!defaultInterface} ipInfo: ${!!ipInfo}`,
    );
  }

  const countryOK = !settings.disallowedCountries.some((country) => ipInfo.country.includes(country));
  const internalIpOK = !settings.disallowedIntIps.some((ip) => defaultInterface.ip.includes(ip));
  const externalIpOK = !settings.disallowedExtIps.some((ip) => ipInfo.ip.includes(ip));
  const interfaceOK = settings.allowedInterfaces.some((inter) => defaultInterface.interface.includes(inter));

  console.log(`Country OK: ${countryOK} Internal IP OK: ${internalIpOK} External IP OK: ${externalIpOK} Interface OK: ${interfaceOK}`);

  if (!countryOK || !internalIpOK || !externalIpOK || !interfaceOK) {
    return await downTransmission(
      transmissionContainer,
      `Shutting down: Country OK: ${countryOK}, Internal IP OK: ${internalIpOK}, External IP OK: ${externalIpOK}, Interface OK: ${interfaceOK}.`,
    );
  }

  if (portOpen) {
    console.log(`Port ${port} is open`);
    return;
  }

  console.log(`Port ${port} is not open. Fetching new port.`);

  //fetch new port
  const request = await fetch(`https://connect.pvdatanet.com/v3/Api/port?ip[]=${defaultInterface.ip}`)
  const data = await request.json() as {status: string, supported: boolean}

  console.log(`Data received: ${JSON.stringify(data)}`);

  if (!data.status || !data.supported) {
    return await downTransmission(
      transmissionContainer,
      `Shutting down: could not fetch new port, data: ${JSON.stringify(data)}`,
    );
  }

  const newPort= Number(data.status.split(" ")[1]);

  if (!newPort) {
    return await downTransmission(
      transmissionContainer,
      `Shutting down: could not parse new port, data: ${JSON.stringify(data)}`,
    );
  }

  console.log(`Setting port to ${newPort}`);
  const resultOK = await gluetunContainer.setOpenFirewallPort(newPort);
  if (!resultOK) {
    return await downTransmission(
      transmissionContainer,
      `Shutting down: could not open new port in gluetun firewall`,
    );
  }
  console.log(`Port in gluetun firewall opened successfully`);
  await transmissionClient.setPort(newPort);

  const numPortsChanged = kvDataStorage.get<number>('numPortsChanged') || 0;
  await kvDataStorage.set({ numPortsChanged: numPortsChanged + 1 });

  console.log('Port set');
  const newPortOpen = await transmissionClient.testPortIfOpen();
  console.log(`Port ${newPort} is open: ${newPortOpen}`);

  if (!newPortOpen) {
    return await downTransmission(
      transmissionContainer,
      `Shutting down: new port is still not open, data: ${JSON.stringify(data)}`,
    );
  }

  await notificationService.sendNotification(`Port changed from ${port} to ${newPort} successfully`);
}
