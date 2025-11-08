// @ts-ignore
import TransmissionClient from 'transmission';
import { settings } from '../settings';

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
          return;
        }
        if (!('port-is-open' in arg)) {
          console.log('port-is-open-arg', arg);
          resolve(false);
          return;
        }
        resolve(arg['port-is-open']);
      });
    });
  }

  async testPortIfOpen2() {
      this.client.callServer({ "method": "port-test" }, (err: any, arg: any) => {
        if (err) {
          console.error('Error testing port:', err);
          return;
        }
        
        console.log('Port test result:', arg);
      });
  }
}

export const transmissionClient = new Transmission({
  host: 'localhost',
  port: 9091,
});

transmissionClient.getPort().then(port => {
  console.log('Current Transmission port:', port);
}).catch(err => {
  console.error('Error getting Transmission port:', err);
});


transmissionClient.testPortIfOpen2()
