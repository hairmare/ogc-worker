# Online GLSA Checker Worker

## Install

```
npm install
```

## Usage

```
cp config.json-dist config.json
node index.js
```

## Run on Docker

```
docker run --link ogc-api:api --link ogc-api:zmq --link docker:docker --env WORKER_TYPE=all -d hairmare/ogc-worker
```
