FROM node:lts-alpine AS base

FROM base AS build 
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build


FROM base AS production
RUN apk upgrade --no-cache --available \
    && apk add --no-cache \
        chromium-swiftshader \
        ttf-freefont \
        freetype      

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
