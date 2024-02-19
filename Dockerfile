FROM node:18-alpine3.17 as builder
WORKDIR /usr/app
COPY package*.json .
RUN npm install
COPY . .
VOLUME [ "../rsvc_fe/build" ]
CMD ["npm","run","start"]
