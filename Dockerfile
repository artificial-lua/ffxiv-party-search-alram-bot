FROM node

COPY ./build/app.js /app/app.js
COPY ./package.json /app/package.json

WORKDIR /app

RUN npm install

CMD ["node", "app.js"]