import { v2 as compose } from 'docker-compose';
import { settings } from '../settings';

type IPInfo = {
  ip: string,
  hostname: string,
  city: string,
  region: string,
  country: string,
  loc: string,
  org: string,
  postal: string,
  timezone: string,
}

export class DockerContainer {
  constructor(private service: string, private cwd: string, private serviceName?: string) {
    if (!serviceName) {
      this.serviceName = service;
    }
  }

  async up() {
    return compose.upOne(this.service, { cwd: this.cwd });
  }

  async down() {
    return compose.downOne(this.service, { cwd: this.cwd });
  }

  async exec(command: string) {
    return await compose.exec(this.service, command, { cwd: this.cwd });
  }

  async getState() {
    const result = await compose.ps({ cwd: this.cwd, commandOptions: [["--format", "json"]] });

    return result.data.services.find((service) => service.name === this.serviceName);
  }

  async getIpInfo(): Promise<IPInfo | null> {
    const { exitCode, out: outRaw } = await this.exec(settings.ipInfoCommand);
    if (exitCode !== 0) {
      return null;
    }

    return JSON.parse(outRaw) as IPInfo;
  }

  async getDefaultInterface() {
    const { exitCode, out: outRaw } = await this.exec(settings.interfaceCommand);
    if (exitCode !== 0) {
      return null;
    }

    const dataRaw = outRaw.trim().replace(/\n| {2}/g, ' ').split(' ');

    return {
      interface: dataRaw[4],
      ip: dataRaw[6],
    }
  }
}
