import { Transmission } from './transmission';
import { DockerContainer } from './docker';
import { settings } from './settings';
import { notificationService } from './notification';

async function downTransmission(transmissionContainer: DockerContainer, reason: string) {
  console.log(reason);

  await notificationService.sendNotification(reason, true);
  return await transmissionContainer.down();
}

export async function setPortFlow() {
  console.log('Starting set port flow');
  const transmissionClient = new Transmission(settings.transmission);
  const transmissionContainer = new DockerContainer(
    settings.dockerTransmission.service,
    settings.dockerTransmission.cwd,
    settings.dockerTransmission.serviceName
  );

  const containerState = await transmissionContainer.getState();
  if (containerState?.state !== 'running') {
    console.log('Transmission service is not running');
    return;
  }

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
  await transmissionClient.setPort(newPort);

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
