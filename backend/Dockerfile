FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8086

CMD ["node", "server.js"]
