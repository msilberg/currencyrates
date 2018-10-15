## Currency Rates In Real Time

**Requirements**
* node 8*
* docker 18.06.1-ce
* docker-compose

**Installation & First Run**
* git clone PROJECT_URL
* cd currencyrates
* chmod +x start.sh
* ./start.sh

After executing script start.sh make sure you have a container with MongoDB by running
```docker ps -a```

If it is working then you should see following output

```
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                      NAMES
23e8190628d0        mongo               "docker-entrypoint.s…"   6 seconds ago       Up 5 seconds        0.0.0.0:27017->27017/tcp   currencyrates_crypto_1
```

Finally you can reach Application's first page at http://localhost:8080/

**Supported Features**

The application fetches the data simultaneously and once a second from three next feeds:
* Coin Market Cap
* Crypto Compare
* Coin Api.IO

Application has two pages First Page and Exchange Rate Log History page.

The Node.js server is interacting with clients by means of websocket, in other words as a part of your tests process you can open App's page on numerous browser's tabs or windows, but each time server gets an update about exchange rate it sends new rate simultaneously to all connected clients.

The same relates to Comments section, e.g. once one of clients writes a new comment then everybody else gets immediately updated with it. 
