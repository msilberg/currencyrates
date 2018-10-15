#!/bin/bash
npm install
mkdir -p data
sudo docker-compose up -d crypto
sleep 5
export NODE_ENV=production
node index.js
