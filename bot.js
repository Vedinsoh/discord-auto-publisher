require('dotenv').config();
const fetch = require('node-fetch');
const Discord = require('discord.js');
const bot = new Discord.Client();

bot.on('ready', async () => {
  function presence() {
    bot.user
      .setPresence({
        activity: {
          name: `channels in ${bot.guilds.cache.size} servers`,
          type: 'WATCHING',
        },
        status: 'online',
      })
      .catch((err) => bot.logger.log(err, 'error'));
  }
  
  presence();
  setInterval(() => { presence() }, 1 * 60 * 60 * 1000); // hour * minutes * seconds * milliseconds
  console.log(`Connected! Discord.js ${Discord.version}, monitoring ${bot.guilds.cache.size} servers.`);
});

bot.on('message', async (message) => {
  if (message.channel.type === "news") {
    await fetch(
      `https://discord.com/api/v6/channels/${message.channel.id}/messages/${message.id}/crosspost`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${process.env.TOKEN}`,
        },
      }
    )
  }
});

bot.login(process.env.TOKEN);