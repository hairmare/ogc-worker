FROM hairmare/node
Maintainer Lucas Bickel <hairmare@purplehaze.ch>

# install deps

RUN emerge net-libs/zeromq -q

# stage app

COPY ogc-worker.js /usr/local/src/ogc-worker/ogc-worker.js
COPY package.json  /usr/local/src/ogc-worker/package.json
COPY README.md     /usr/local/src/ogc-worker/README.md
COPY app           /usr/local/src/ogc-worker/app

# install app

RUN cd /usr/local/src/ogc-worker; npm install -g && chmod +x /usr/lib/node_modules/ogc-worker/ogc-worker.js

# configure runtime

ENTRYPOINT [ "node", "/usr/lib/node_modules/ogc-worker/ogc-worker.js" ]
