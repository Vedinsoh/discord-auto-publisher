[![Auto Publisher](https://cdn.discordapp.com/app-icons/739823232651100180/afc7325d445543050505179799e8fb7d.png)](https://discord.com/api/oauth2/authorize?client_id=739823232651100180&permissions=10240&scope=bot "Auto Publisher bot")

# Discord Auto Publisher

**Automatically publish messages or news in your announcement channels!**

A lightweight command-less bot that will automatically publish every new message in your [announcement/news channels](https://support.discord.com/hc/en-us/articles/360032008192-Announcement-Channels-) to other servers who follow it. An excellent solution for servers who rely on bots (such as RSS feeds) or webhooks to publish their news, allowing your moderators to get some rest from manual publishing. Unlike most other bots who can publish messages, this bot utilizes advanced URL detection algorithm that will ensure all your messages containing URLs will be published properly with no embeds missing!

![](https://media.giphy.com/media/KxgsmVFc4nMF7U50UF/giphy.gif)

**The bot features no commands because the setup is really easy!**

## How to set up?

1. Invite the bot to your server: https://invite.auto-publisher.gg/
2. Navigate to your announcement channel's settings and give the bot following permissions: `View Channel`, `Send Messages`, `Manage Messages`, `Read Message History`
3. Repeat step 2. for every channel where you want auto-publishing
4. Done!

### Keep in mind...

- The bot can only publish 10 messages per hour per channel (just as users), this is rate limited by Discord!
- If you want to temporarily stop the bot from publishing messages in any of your announcement channels, just disable its' `View Channel` permission in a desired channel and enable it back when you're ready.
- **IMPORTANT:** If one of your announcement channels is very spammy, your server will get blacklisted from using the bot! Please be sensible when using the bot and don't make your moderation log channels or general chat into an announcement channel. If your chanel has a high message flow, it shouldn't be an announcement channel.

### Need help? Join our Discord support server!

https://discord.gg/xcEeJkdQX8

---

Did the bot help you or do you simply want to support my work? ❤️

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/acehox)

## Self-hosting

The code is published here for transparency, and to help other developers implement the same functionality in their own bots.

Adding the publicly-hosted bot is free and will be enough for almost everyone, so that is the recommended route unless you have a specific reason not to take it — reading the code, experimenting with it, or running your own copy in servers you look after.

You're welcome to host it on your own machine, but please keep in mind that no support is provided for self-hosted instances (do it at your own risk). Hosting an instance for other people — publishing an invite link, or adding your copy to servers you don't run — is not permitted by the licence, whether or not you charge for it. There's no need to anyway: the public bot is free to add.
