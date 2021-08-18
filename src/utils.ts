import si from 'systeminformation';
import isOnline from 'is-online';
import { getLogger } from 'log4js';

let timer = 0;
const invalid_name = ['lo', 'tun', 'kube', 'docker', 'vmbr', 'br-', 'vnet', 'veth'];
const netName: Array<string> = [];

class Status {
  online4 = false;
  online6 = false;
  uptime = 0;
  load = 0;
  cpu = 0;
  network_rx = 0;
  network_tx = 0;
  network_in = 0;
  network_out = 0;
  memory_total = 0;
  memory_used = 0;
  swap_total = 0;
  swap_used = 0;
  hdd_total = 0;
  hdd_used = 0;
  updated = 0;
  custom = '';

  async getLoad() {
    const [{ avgLoad, currentLoad }, { uptime }] = await Promise.all([si.currentLoad(), si.time()]);
    this.uptime = Number(uptime);
    this.load = avgLoad;
    this.cpu = Math.round(currentLoad);
  }

  async getMemory() {
    const { total, used, swaptotal, swapused } = await si.mem();
    this.memory_total = total / 1024;
    this.memory_used = used / 1024;
    this.swap_total = swaptotal / 1024;
    this.swap_used = swapused / 1024;
  }

  async getDisk() {
    const fsSize = await si.fsSize();
    let total = 0,
      used = 0;
    for (const item of fsSize) {
      total += item.size;
      used += item.used;
    }
    this.hdd_total = total / 1024 / 1024;
    this.hdd_used = used / 1024 / 1024;
  }

  async getNetwork(ip: number) {
    const networkStats = await si.networkStats();
    let _in = 0,
      out = 0,
      rx = 0,
      tx = 0;

    if (timer-- <= 0) {
      ip == 4
        ? (this.online6 = true) && (this.online4 = await isOnline({ ipVersion: 4 }))
        : (this.online4 = true) && (this.online6 = await isOnline({ ipVersion: 6 }));
      timer = 300;
    }

    if (!netName.length) {
      for (const item of networkStats) {
        invalid_name.forEach(v => {
          if (!item.iface.includes(v)) netName.push(item.iface);
        });
      }
    }

    for (const item of networkStats) {
      if (netName.includes(item.iface)) {
        _in += item.rx_bytes;
        out += item.tx_bytes;
        rx += item.rx_sec;
        tx += item.tx_sec;
      }
    }

    this.network_in = _in;
    this.network_out = out;
    this.network_rx = rx;
    this.network_tx = tx;
  }

  public async updateAll(ip: number) {
    try {
      await Promise.all([this.getLoad(), this.getDisk(), this.getNetwork(ip), this.getMemory()]);
    } catch (error) {
      getLogger().error(`Error while fetching data: ${ error.message }`);
    }
  }
}

const instance = new Status();

export default async function (ip: number): Promise<Status> {
  await instance.updateAll(ip);
  return instance;
}
