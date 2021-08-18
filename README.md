# NodeStatus-client

The client of NodeStatus written in TypeScript

## How To Use

1、Install Node.js first

2、Install NodeStatus-client
```shell
npm i pm2 nodestatus-client -g
status-client -dsn "ws://username:password@localhost"
pm2 status # check running status
pm2 log nodestatus-client # check logs
```

## Usage

```shell
Usage: status-client [options]

Options:
  -dsn, --dsn <dsn>          Data Source Name, format: ws(s)://username:password@host:port (default: "")
  -h, --host <host>          The host of the server (default: "")
  -u, --user <username>      The username of the client
  -p, --password <password>  The password of the client
  -p, --port <port>          the port of the server
  -i, --interval <interval>  the interval (default: "1500")
  --help                     display help for command
```

