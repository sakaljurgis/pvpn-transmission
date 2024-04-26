import dotenv from 'dotenv';
dotenv.config();

export const settings = {
  ipInfoCommand: `curl ${process.env.IP_INFO_URL ?? 'https://ipinfo.io'}`,
  interfaceCommand: 'ip route get 8.8.8.8',
  transmission: {
    host: process.env.TRANSMISSION_HOST,
    port: Number(process.env.TRANSMISSION_PORT),
  },
  dockerTransmission: {
    cwd: process.env.DOCKER_TRANSMISSION_CWD ?? __dirname,
    service: process.env.DOCKER_TRANSMISSION_SERVICE ?? 'transmission',
    serviceName: process.env.DOCKER_TRANSMISSION_SERVICE_NAME ?? process.env.DOCKER_TRANSMISSION_SERVICE,
  },
  allowedInterfaces: process.env.ALLOWED_INTERFACES?.split(',') ?? [],
  disallowedCountries: process.env.DISALLOWED_COUNTRIES?.split(',') ?? [],
  disallowedIntIps: process.env.DISALLOWED_INTERNAL_IPS?.split(',') ?? [],
  disallowedExtIps: process.env.DISALLOWED_EXT_IPS?.split(',') ?? [],
} as const;
