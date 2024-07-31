# Run Node.js on Alpine Linux
FROM node:20-alpine

# Define the environment variables
ENV NODE_ENV=production

# Set the working directory
WORKDIR /home/node/app

# Copy all files from the current directory to the working directory
COPY . .

# Install necessary packages
RUN apk add --no-cache g++ make python3 linux-headers

# Install dependencies
RUN npm ci --include=dev

# Build the TypeScript files
RUN npm run build

# Start the application
CMD npm run start