FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci

EXPOSE 5173

WORKDIR /app/packages/jaeger-ui

CMD ["npx", "vite", "--host"]