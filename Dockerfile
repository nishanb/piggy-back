FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY main.js ./
COPY shared ./shared
COPY client ./client
COPY server ./server

EXPOSE 8080
ENTRYPOINT ["node", "main.js"]
CMD ["serve", "-p", "8080"]
