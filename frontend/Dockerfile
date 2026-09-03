FROM node:24-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

FROM base AS development

ENV CHOKIDAR_USEPOLLING=true
EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]

FROM base AS build

ARG VITE_API_BASE_URL=http://localhost:8000/api/v1/staff
ARG VITE_BRAND_NAME=Crystal-shop
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_BRAND_NAME=$VITE_BRAND_NAME

RUN npm run build

FROM nginx:1.29-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
