# FROM node:20
# WORKDIR /app
# COPY . .
# RUN npm install
# RUN npm run build
# EXPOSE 3000
# CMD ["node", "dist/server.js"]
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# The API writes notes into ./data. Root owns /app, so hand that one directory
# to the user we are about to become.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/server.js"]
