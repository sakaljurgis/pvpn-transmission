import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import path from 'path';
const __dirname = path.resolve();

class KeyValueDataStorage {
  private readonly data: Record<string, unknown> = {};
  private readonly filePath: string;

  constructor() {
    this.filePath = join(__dirname, 'kv-data.json');
    this.data = {};
    if (existsSync(this.filePath)) {
      try {
        const rawData = readFileSync(this.filePath);
        this.data = JSON.parse(rawData.toString());
      } catch (e) {
        this.data = {};
      }
    }
  }

  get<T>(key: string): T | null {
    if (this.data[key]) {
      return this.data[key] as T;
    }

    return null;
  }

  async set(data: Record<string, unknown>): Promise<void> {
    Object.keys(data).forEach((key) => {
      this.data[key] = data[key];
    });

    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

export const kvDataStorage = new KeyValueDataStorage();
