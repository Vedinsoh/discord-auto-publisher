# Project tech stack
- Monorepo architecture using Turborepo
  -  apps in ./apps
  -  packages in ./packages - prefixed with "@ap/" when imported in apps
- Docker for containerization
  - Docker container networking for inter-service communication
  - Development & production scripts in ./scripts
- bun runtime & package manager
- TypeScript & ES modules
- Biome.js for linting & formatting