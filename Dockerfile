# Calendario de Pedidos y Recepción - Docker
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias (si las hubiera)
COPY package*.json ./
RUN npm install --omit=dev 2>&1 | tee /tmp/npm.log || (cat /tmp/npm.log; echo "npm install sin dependencias, continuando...")

# Copiar el resto del proyecto
COPY . .

# Puerto del servidor (respeta process.env.PORT)
EXPOSE 3000

CMD ["node", "server.js"]
