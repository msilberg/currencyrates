#!/bin/bash
mkdir data
docker run -d --name crypto_db -p 27017:27017 -v ${PWD}/data/:/data/db mongo
export NODE_ENV=production
node index.js
