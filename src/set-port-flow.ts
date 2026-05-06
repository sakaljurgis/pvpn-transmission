import { transmissionClient } from './services/transmission-client';
import { settings } from './settings';
import { notificationService } from './services/notification';
import { kvDataStorage } from './services/kv-data-storage';
import { dailyCheckIn } from './services/daily-check-in';
import { transmissionContainer } from './services/transmission-container';
import { gluetunContainer } from './services/gluetun-container';

export async function setPortFlow() {
  try {
    await doSetPortFlow();
  } catch (e) {
    console.error('Unexpected error in set port flow', e);
    const reason = e instanceof Error ? e.message : JSON.stringify(e);
    await notificationService.sendNotification(`Unexpected error in set port flow: ${reason}`, true);
  }
  await dailyCheckIn();
}

const checkIfPortOpen = true;

async function doSetPortFlow() {
  console.log('Starting set port flow');

  const containerState = await transmissionContainer.getState().catch(() => null);
  if (containerState?.state !== 'running') {
    console.log('Transmission service is not running');
    await kvDataStorage.set({ isServiceRunning: false });
    return;
  }

  const numRuns = kvDataStorage.get<number>('numRuns') || 0;
  await kvDataStorage.set({ isServiceRunning: true, numRuns: numRuns + 1, lastRun: Date.now() });

  console.log('Gathering info');

  let port: number;
  try {
    port = await transmissionClient.getPort();
    console.log(`Port: ${port}`);
    await kvDataStorage.set({ currentPort: port });
  } catch (e) {
    console.error('Failed to get port from Transmission RPC, skipping cycle', e);
    await notificationService.sendNotification('Could not reach Transmission RPC, skipping cycle');
    return;
  }

  const portOpen = checkIfPortOpen
    ? await transmissionClient.testPortIfOpen().catch(() => 'error_checking_port' as const)
    : 'not_checked';
  console.log(`Port is open: ${portOpen}`);

  const defaultInterface = await transmissionContainer.getDefaultInterface().catch(() => null);
  const ipInfo = await transmissionContainer.getIpInfo().catch(() => null);
  console.log(`Default interface: ${defaultInterface?.interface} Internal ip: ${defaultInterface?.ip}`);
  console.log(`External ip: ${ipInfo?.ip} Country: ${ipInfo?.country}`);

  if (!defaultInterface || !ipInfo) {
    console.error(`Could not gather network info, skipping cycle. defaultInterface: ${!!defaultInterface} ipInfo: ${!!ipInfo}`);
    await notificationService.sendNotification(`Could not gather network info (interface: ${!!defaultInterface}, ipInfo: ${!!ipInfo}), skipping cycle`);
    return;
  }

  await kvDataStorage.set({
    country: ipInfo.country,
    internalIp: defaultInterface.ip,
    externalIp: ipInfo.ip,
    interface: defaultInterface.interface,
  });

  const countryOK = !settings.disallowedCountries.some((country) => ipInfo.country.includes(country));
  const internalIpOK = !settings.disallowedIntIps.some((ip) => defaultInterface.ip.includes(ip));
  const externalIpOK = !settings.disallowedExtIps.some((ip) => ipInfo.ip.includes(ip));
  const interfaceOK = settings.allowedInterfaces.some((inter) => defaultInterface.interface.includes(inter));

  console.log(`Country OK: ${countryOK} Internal IP OK: ${internalIpOK} External IP OK: ${externalIpOK} Interface OK: ${interfaceOK}`);

  if (!countryOK || !internalIpOK || !externalIpOK || !interfaceOK) {
    return await transmissionContainer.downTransmission(
      `Shutting down: Country OK: ${countryOK}, Internal IP OK: ${internalIpOK}, External IP OK: ${externalIpOK}, Interface OK: ${interfaceOK}.`,
    );
  }

  if (portOpen === true) {
    console.log(`Port ${port} is open`);
    return;
  }

  console.log(`Port ${port} is not open or not checked (status: ${portOpen}). Fetching new port.`);

  let data: { status: string; supported: boolean };
  try {
    const request = await fetch(`https://connect.pvdatanet.com/v3/Api/port?ip[]=${defaultInterface.ip}`);
    data = await request.json() as { status: string; supported: boolean };
    console.log(`Data received: ${JSON.stringify(data)}`);
  } catch (e) {
    console.error('Failed to fetch new port from PrivateVPN API, skipping cycle', e);
    await notificationService.sendNotification('Could not fetch new port from PrivateVPN API, skipping cycle');
    return;
  }

  if (!data.status || !data.supported) {
    console.error(`PrivateVPN API returned unexpected data, skipping cycle: ${JSON.stringify(data)}`);
    await notificationService.sendNotification(`PrivateVPN API returned unexpected data (${JSON.stringify(data)}), skipping cycle`);
    return;
  }

  const newPort = Number(data.status.split(' ')[1]);
  if (!newPort) {
    console.error(`Could not parse new port, skipping cycle: ${JSON.stringify(data)}`);
    await notificationService.sendNotification(`Could not parse new port from PrivateVPN API (${JSON.stringify(data)}), skipping cycle`);
    return;
  }

  if (newPort === port) {
    console.log(`New port ${newPort} is the same as the old port`);
    return;
  }

  console.log(`Setting port to ${newPort}`);
  const firewallOK = await gluetunContainer.setOpenFirewallPort(newPort);
  if (!firewallOK) {
    console.error('Could not open new port in Gluetun firewall, skipping cycle');
    await notificationService.sendNotification('Could not open new port in Gluetun firewall, skipping cycle');
    return;
  }
  console.log('Port in Gluetun firewall opened successfully');

  try {
    await transmissionClient.setPort(newPort);
    await kvDataStorage.set({ currentPort: newPort });
  } catch (e) {
    console.error('Failed to set port in Transmission, skipping cycle', e);
    await notificationService.sendNotification('Could not set new port in Transmission RPC, skipping cycle');
    return;
  }

  const numPortsChanged = kvDataStorage.get<number>('numPortsChanged') || 0;
  await kvDataStorage.set({ numPortsChanged: numPortsChanged + 1 });

  console.log('Port set');
  const newPortOpen = checkIfPortOpen
    ? await transmissionClient.testPortIfOpen().catch(() => 'error_checking_port' as const)
    : 'not_checked';
  console.log(`Port ${newPort} is open: ${newPortOpen}`);

  await notificationService.sendNotification(`Port changed from ${port} to ${newPort} successfully. New port open: ${newPortOpen}.`);
}
