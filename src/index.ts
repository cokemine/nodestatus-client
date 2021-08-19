import { URL } from 'url';
import WebSocket from 'ws';
import { encode } from '@msgpack/msgpack';
import { getLogger, configure } from 'log4js';
import { program } from 'commander';
import getStatus from './utils';

configure({
  appenders: {
    out: { type: 'stdout' }
  },
  categories: {
    default: { appenders: ['out'], level: 'info' }
  }
});
program
  .option('-dsn, --dsn <dsn>', 'Data Source Name, format: ws(s)://username:password@host:port', '')
  .option('-h, --host <host>', 'The host of the server', '')
  .option('-u, --user <username>', 'The username of the client')
  .option('-p, --password <password>', 'The password of the client')
  .option('-p, --port <port>', 'the port of the server')
  .option('-i, --interval <interval>', 'the interval', '1500')
  .parse(process.argv);

const logger = getLogger();
const options = program.opts();

let server = '';
let username = options.username;
let password = options.password;
const port = options.port;
const interval = options.interval;

if (options.dsn || options.host) {
  try {
    const dsn = new URL(options.dsn || options.host);
    dsn.username && (username = dsn.username);
    dsn.password && (password = dsn.password);
    server = dsn.origin.replace('http', 'ws');
    if (server.split(':').length === 2 && port) {
      server += ':' + port;
    }
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

if (!username || !password) {
  logger.error('No username or password input');
  process.exit(1);
}

let id: NodeJS.Timeout;

function connect() {
  id && clearTimeout(id);
  const socket = new WebSocket(`${ server }/connect`);

  socket.on('close', () => {
    logger.warn('Disconnected from server. Trying to reconnect');
    id = setTimeout(connect, 5 * 1000);
  });

  socket.on('error', () => socket.close());

  socket.on('open', () => {
    socket.once('message', buf => {
      const msg = buf.toString();
      if (!msg.includes('Authentication required')) return;
      logger.info(msg);
      socket.send(
        encode({
          username,
          password
        })
      );
      socket.once('message', buf => {
        const msg = buf.toString();
        if (!msg.includes('Authentication successful')) {
          logger.error(msg);
          return socket.close();
        }
        logger.info(msg);
        socket.once('message', async buf => {
          const msg = buf.toString();
          logger.info(msg);
          const ip = msg.includes('IPv4') ? 6 : 4;
          while (socket.readyState == 1) {
            const [data] = await Promise.all([getStatus(ip), new Promise(resolve => setTimeout(resolve, interval))]);
            socket.send(encode(data));
          }
          return socket.close();
        });
      });
    });
  });
}

connect();
