FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '' \
  '  location /api/ {' \
  '    proxy_pass http://backend:8086/api/;' \
  '    proxy_http_version 1.1;' \
  '    proxy_set_header Host $host;' \
  '    proxy_set_header X-Real-IP $remote_addr;' \
  '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
  '    proxy_set_header X-Forwarded-Proto $scheme;' \
  '  }' \
  '' \
  '  location /socket.io/ {' \
  '    proxy_pass http://backend:8086/socket.io/;' \
  '    proxy_http_version 1.1;' \
  '    proxy_set_header Upgrade $http_upgrade;' \
  '    proxy_set_header Connection "upgrade";' \
  '    proxy_set_header Host $host;' \
  '  }' \
  '}' \
  > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
