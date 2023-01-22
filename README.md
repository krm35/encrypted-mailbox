# **PGP-SMTP: an SMTP server with PGP**

**To start a dev server**

_Start redis_ `redis-server --save "" --appendonly no`

_Start mongodb_ `mongod --dbpath /tmp`

_Go to back & front directories and type_ `npm install` `npm run dev`


**To start a production server**

_Build static files_ `cd front && npm install && npm run build`

_Install redis_ `sudo apt-get install redis`

_Install mongodb_ `sudo apt-get install mongodb-server`

_Install back-end dependencies_ `cd back && npm install`

_Create a secrets.json file in the back directory_

```
{
  "domain": "@yourdomain.yourextension",
  "sendmailConf": {
    "silent": true,
    "dkim": {
        privateKey: "optional - path of your private key file",
        keySelector: 'optional - domainkey'
    }
  },
  "host": "Your Server IP",
  "smtpPort": 25,
  "httpPort": 443,
  "ssl": true,
  "sslKey": "path to key if ssl",
  "sslCert": "path to cert if ssl"
}
```

_Create a service_

`nano pgp-smtp-daemon.service`

```
[Unit]
Description=Start pgp-smtp

[Service]
WorkingDirectory=/home/YOURUSER/pgp-smtp/back
ExecStart=node index.js
Restart=always
RestartSec=5000ms

SyslogIdentifier= pgp-smtp-daemon

[Install]
WantedBy=default.target

```
`sudo cp pgp-smtp-daemon.service /etc/systemd/system/`

`sudo systemctl enable pgp-smtp-daemon `

`sudo systemctl start pgp-smtp-daemon`