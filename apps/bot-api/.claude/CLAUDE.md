- Backend app used as internal API for apps/bot-core - central place sending requests to Discord API due to bot-core having multiple processes.

# Project tech stack
- Express - Web framework for developing REST API - https://expressjs.com/en/4x/api.html
- discord.js - Framework for Discord API - https://discord.js.org/docs/packages/discord.js/main
- redis - In-memory data structure store, used as a cache - https://redis.io/docs/latest/develop/clients/nodejs/
- zod - TypeScript-first schema validation with static type inference - https://v3.zod.dev/