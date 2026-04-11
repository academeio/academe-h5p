FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy H5P core files (cloned from h5p-php-library)
COPY server/h5p-core ./server/h5p-core

# Copy H5P libraries and activities
COPY libs ./libs
COPY activities ./activities

# Copy server code
COPY server/server.mjs ./server/

EXPOSE 3200

WORKDIR /app/server
CMD ["node", "server.mjs"]
