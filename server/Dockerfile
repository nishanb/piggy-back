FROM ubuntu:latest

WORKDIR /src/client

COPY package.json .

RUN apt update -y && apt install nodejs npm -y 

RUN npm i

COPY . .

CMD ["node","server.js"]