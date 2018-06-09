FROM node:carbon-slim

WORKDIR /usr/src/app
ENV NODE_ENV production

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

CMD [ "node", "bin/www" ]

USER node
