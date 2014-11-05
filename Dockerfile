FROM hairmare/node
Maintainer Lucas Bickel <hairmare@purplehaze.ch>

# install deps

RUN emerge net-libs/zeromq -q

# install app

COPY index.js /opt/ogc-worker/index.js
COPY package.json /opt/ogc-worker/package.json
COPY README.md /opt/ogc-worker/README.md
COPY app /opt/ogc-worker/app

WORKDIR /opt/ogc-worker
RUN npm install

# configure app

COPY config.json-dist /opt/ogc-worker/config.json

# configure runtime

CMD bash -c ' \
    sed -e "s|tcp://127.0.0.1:3000|"$ZMQ_PORT_3000_TCP"|" \
        -e "s|http://localhost|http://"$API_PORT_80_TCP_ADDR":"$API_PORT_80_TCP_PORT"|" \
        -e "s|http://docker|http://"$DOCKER_PORT_4444_TCP_ADDR"|" \
        -e "s|4444|http://"$DOCKER_PORT_4444_TCP_PORT"|" \
        -i /opt/ogc-worker/config.json; \
    /opt/ogc-worker/index.js work WORKER_TYPE'
