import { DockerContainer } from './docker';
import { settings } from '../settings';

export class GluetunContainer extends DockerContainer {
  constructor() {
    super(
      settings.dockerGluetun.service,
      settings.dockerGluetun.cwd,
      settings.dockerGluetun.serviceName
    );
  }

  async setOpenFirewallPort(port: number) {
    const {exitCode: exit0} = await this.exec(`iptables -A INPUT -i tun0 -p tcp --dport ${port} -j ACCEPT`);
    const {exitCode: exit1} = await this.exec(`iptables -A INPUT -i tun0 -p udp --dport ${port} -j ACCEPT`);

    return exit0 === 0 && exit1 === 0;
  }
}

export const gluetunContainer = new GluetunContainer();
