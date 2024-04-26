// @ts-ignore
import TransmissionClient from 'transmission';

type TransmissionOptions = {
  url?: string;
  host?: string;
  port?: number;
  ssl?: boolean;
}

export class Transmission {
  client: any;

  constructor(transmissionOptions: TransmissionOptions) {
    this.client = new TransmissionClient(transmissionOptions);
  }

  async getPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.session((err: any, arg: any) => {
        if (err) {
          reject(err);
        }
        resolve(arg['peer-port']);
      });
    });
  }

  async setPort(port: number) {
    return new Promise<void>((resolve, reject) => {
      this.client.callServer({ "arguments": { "peer-port": port }, "method": "session-set" }, (err: any, arg: any) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  async testPortIfOpen(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.callServer({ "method": "port-test" }, (err: any, arg: any) => {
        if (err) {
          reject(err);
        }
        resolve(arg['port-is-open']);
      });
    });
  }
}
