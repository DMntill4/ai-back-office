# Usar la versión LTS de Node.js 22 en Alpine (incluye node:sqlite nativo para ingest)
FROM node:22-alpine

# Definir el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar manifiestos de workspaces para aprovechar caché de dependencias
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/api/package.json ./packages/api/
COPY packages/ingest/package.json ./packages/ingest/
COPY packages/notifiers/package.json ./packages/notifiers/
COPY packages/daemon/package.json ./packages/daemon/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/

# Instalar dependencias
RUN npm install

# Copiar el resto del código del proyecto
COPY . .

# Exponer el puerto de la API Fastify para la consola web y de escritorio
EXPOSE 3001

# Iniciar la API Fastify con el daemon autónomo
CMD ["npm", "run", "api"]
