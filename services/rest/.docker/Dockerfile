# Run Node.js on Alpine Linux
FROM node:20-alpine

# Define the environment variables
ENV NODE_ENV=production

# Set the working directory
WORKDIR /home/node/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Bundle app source
COPY . .

# Build the TypeScript files
RUN npm run build

# Start the app
CMD npm run start