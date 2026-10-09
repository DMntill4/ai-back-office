# Usar la versión LTS de Node.js en Alpine (imagen ligera y aislada)
FROM node:20-alpine

# Definir el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar primero la definición de dependencias para aprovechar la caché de capas de Docker
COPY package.json package-lock.json ./

# Instalar dependencias estrictamente dentro del contenedor
RUN npm install

# Copiar el resto del código del proyecto
COPY . .

# Mantener el contenedor activo en modo desarrollo para ejecutar pruebas y comandos
CMD ["sh", "-c", "tail -f /dev/null"]
