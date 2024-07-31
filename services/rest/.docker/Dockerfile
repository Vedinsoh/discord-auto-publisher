# Run Node.js on Alpine Linux
FROM node:20-alpine

# Define the environment variables
ENV NODE_ENV=production

# Set the working directory
WORKDIR /home/node/app

# Copy all files from the current directory to the working directory
COPY . .

# Install dependencies
RUN npm ci --include=dev

# Start the application
CMD npm run start