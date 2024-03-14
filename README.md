# **MAILBOX: Self-host an encrypted mailbox with your own domain name**

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
  "domains": ["@yourdomain2.yourextension"],
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
  "sslKey": "path to key for both servers",
  "sslCert": "path to cert for both servers",
  "sslHttp": true,
  "sslKeyHttp": "path to key if ssl for http",
  "sslCertHttp": "path to cert if ssl for http",
  "sslSmtp": true,
  "sslKeySmtp": "path to key if ssl for smtp",
  "sslCertSmtp": "path to cert if ssl for smtp",
  "attachments": "optional - path to the attachments directory",
  "allowNonAdminSignUp": "boolean true by default -> anyone can sign up",
  "enableQueue": "boolean true by default -> enable the queue to send email from no-reply@yourdomain",
  "enableQueueLogs": "boolean true by default -> enable the queue logs and save them into mongo,
  "gridfs": "boolean true by default -> Save attachments in mongodb"
}
```

_Create a service_

`nano mailbox-daemon.service`

```
[Unit]
Description=Start mailbox

[Service]
WorkingDirectory=/home/YOURUSER/mailbox/back
ExecStart=node index.js
Restart=always
RestartSec=5000ms

SyslogIdentifier= mailbox-daemon

[Install]
WantedBy=default.target

```
`sudo cp mailbox-daemon.service /etc/systemd/system/`

`sudo systemctl enable mailbox-daemon `

`sudo systemctl start mailbox-daemon`