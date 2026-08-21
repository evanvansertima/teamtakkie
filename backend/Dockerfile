FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN node ace build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++
COPY --from=build /app/build ./
COPY docker-entrypoint.sh ./
RUN npm ci --omit=dev && apk del python3 make g++ && chmod +x docker-entrypoint.sh
EXPOSE 3333
CMD ["./docker-entrypoint.sh"]
