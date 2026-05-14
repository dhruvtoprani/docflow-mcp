FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV DOCFLOW_HTTP_HOST=0.0.0.0
ENV DOCFLOW_HTTP_PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start:http"]
