[![Auto Publisher](https://cdn.discordapp.com/app-icons/739823232651100180/afc7325d445543050505179799e8fb7d.png)](https://discord.com/api/oauth2/authorize?client_id=739823232651100180&permissions=10240&scope=bot 'Auto Publisher bot')

# Discord Auto Publisher

**Automatically publish messages or news in your announcement channels!**

A lightweight command-less bot that will automatically publish every new message in your [announcement/news channels](https://support.discord.com/hc/en-us/articles/360032008192-Announcement-Channels-) to other servers who follow it. An excellent solution for servers who rely on bots (such as RSS feeds) or webhooks to publish their news, allowing your moderators to get some rest from manual publishing. Unlike most other bots who can publish messages, this bot utilizes advanced URL detection algorithm that will ensure all your messages containing URLs will be published properly with no embeds missing!

![](https://media.giphy.com/media/KxgsmVFc4nMF7U50UF/giphy.gif)

**The bot features no commands because the setup is really easy!**

## How to set up?

1. Invite the bot to your server: https://discord.com/api/oauth2/authorize?client_id=739823232651100180&permissions=10240&scope=bot
2. Navigate to your announcement channel's settings and give the bot following permissions: `View Channel`, `Send Messages`, `Manage Messages`, `Read Message History`
3. Repeat step 2. for every channel where you want auto-publishing
4. Done!

### Keep in mind...

- The bot can only publish 10 messages per hour per channel (just as users), this is rate limited by Discord!
- If you want to temporarily stop the bot from publishing messages in any of your announcement channels, just disable its' `View Channel` permission in a desired channel and enable it back when you're ready.
- **IMPORTANT:** If one of your announcement channels is very spammy, your server will get blacklisted from using the bot! Please be sensible when using the bot and don't make your moderation log channels or general chat into an announcement channel. If your chanel has a high message flow, it shouldn't be an announcement channel.

### Need help? Message me on Discord:

<a href="https://discord.com/users/150701861626839041" target="_blank">`Forcellrus#5555`</a>

---

Did the bot help you or do you simply want to support my work? ❤️

<a href="https://www.buymeacoffee.com/Forcellrus" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="160" height="44" alt="Buy Me A Coffee"></a>

## Self-hosting

The bot's code provided here is primarily for transparency reasons and to help other developers implement the same functionality to their bots.

Given the bot's simple nature, using the publicly-hosted version will be enough for most people, so it is highly recommended to use that version, unless you have a specific reason not to do so (such as experimenting with the code).

You're free to host this bot on your own machine, but please keep in mind I will not be providing any support in that regard (do it on your own risk). If you're directly hosting this bot, you should not monetize it in any way; the bot's goal is to help everyone and be free of any charge.

Requirements:

- Node ^18.12.0
- Yarn ^3.0.0
- Redis server ^7.0.0
