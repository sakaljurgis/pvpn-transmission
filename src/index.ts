import { Transmission } from './transmission';
import { DockerContainer } from './docker';
import { settings } from './settings';

main().then(() => console.log('All done')).catch(console.error);

async function main() {
  console.log('Starting');
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
    console.log('Could not get default interface or ip info');
    return;
  }

  const countryOK = !settings.disallowedCountries.some((country) => ipInfo.country.includes(country));
  const internalIpOK = !settings.disallowedIntIps.some((ip) => defaultInterface.ip.includes(ip));
  const externalIpOK = !settings.disallowedExtIps.some((ip) => ipInfo.ip.includes(ip));
  const interfaceOK = settings.allowedInterfaces.some((inter) => defaultInterface.interface.includes(inter));

  console.log(`Country OK: ${countryOK} Internal IP OK: ${internalIpOK} External IP OK: ${externalIpOK} Interface OK: ${interfaceOK}`);

  if (!countryOK || !internalIpOK || !externalIpOK || !interfaceOK) {
    console.log('Shutting down transmission service');
    //await dockerContainer.down();
    return;
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
    console.log('Could not fetch new port');
    return;
  }

  const newPort= Number(data.status.split(" ")[1]);

  if (!newPort) {
    console.log('Could not parse new port');
    return;
  }

  console.log(`Setting port to ${newPort}`);
  await transmissionClient.setPort(newPort);

  console.log('Port set');
  const newPortOpen = await transmissionClient.testPortIfOpen();
  console.log(`Port ${newPort} is open: ${newPortOpen}`);

  if (!newPortOpen) {
    console.log('Port is not open, Shutting down transmission service');
    //await dockerContainer.down();
    return;
  }
}
