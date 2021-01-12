"use strict";
//require('dotenv').config();
let config = require("./botconfig.json");
let token = config.token;
let prefix = config.prefix;

const DiscordJS = require("discord.js");
const sqlite3 = require("sqlite3");
const Cron = require('node-cron'); //штука для запуска в определённое время
const DiscordClient = new DiscordJS.Client();
const ChatFunctions = require("./src/ChatFunctions");
const GamesRepository = require("./src/Repositories/GamesRepository");
const ParticipantRepository = require("./src/Repositories/ParticipantRepository");
const SettingsRepository = require("./src/Repositories/SettingsRepository");
const Game = require("./src/Game");
const Settings = require("./src/Settings");
const DbAdapter = require("./src/DbAdapter");

const db = new sqlite3.Database('database.db3');
const dbs = new sqlite3.Database('settings_database.db3');
const dbAdapter = new DbAdapter(db);
const dbsAdapter = new DbAdapter(dbs);
const gamesRepository = new GamesRepository(dbAdapter);
const participantsRepository = new ParticipantRepository(dbAdapter);
const settingsRepository = new SettingsRepository(dbsAdapter);
const game = new Game(dbAdapter, participantsRepository, gamesRepository);
const settings = new Settings(dbsAdapter, settingsRepository);


DiscordClient.on('ready', client => {
  console.log(`готов вкалывать`);
})

Cron.schedule('0 0 0 * * *', () => { //АВТОПИДОР
  settings.GetSubGuilds().then(array => {
    console.log(`Список серверов с подпиской:`);
    console.log(array);
    array.forEach((item, i) => {
      console.log(`Запушено автосообщение на сервере \'` + item.id + `\', на канале \'` + item.defch + `\'.`);

      game.CanStartGame(item.id).then(() => { //функция пидора (неожиданно да)
        game.Run(item.id).then(async winMsg => {
          await game.Tease(DiscordClient.channels.get(item.defch)).then();
          DiscordClient.channels.get(item.defch).send(winMsg);
        }, reject => {
          DiscordClient.channels.get(item.defch).send(reject);
        });
      }, reject => {
        DiscordClient.channels.get(item.defch).send("А пидор сегодня - " + reject);
      });
    });
  });
})


DiscordClient.on('guildCreate', guild => {
  let defaultChannel = "";
  guild.channels.forEach((channel) => {
    if(channel.type == "text" && defaultChannel == "") {
      if(channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
        defaultChannel = channel;
      }
    }
  })
  //defaultChannel will be the channel object that the bot first finds permissions for
  defaultChannel.send('Приветственное сообщение я ещё не написал круто да!');

  let guild_id = guild.id;
  let def_ch = defaultChannel.id;
  settingsRepository
    .IsGuildExists(guild_id).then(isExists => {
      if (isExists) {
        console.log(`Сервер ` + guild_id + ` уже существует, настройки восстановлены.`);
      } else {
        settingsRepository.CreateNewSettings(guild_id, def_ch);
        console.log(`Сервер ` + guild_id + ` успешно инициализирован.`);
      }
    });
})

DiscordClient.on('message', msg => {
  if (msg.author.bot) return;
  if (msg.channel.type == "dm") return;

  /*if (msg.content.match(/^!удалиэто/)) {
    console.log(`команда удалиэто`);
    const response = msg.channel.send("сообщение с командой удалено");
    ChatFunctions.deleteMessage(msg, 2000);
  }*/

  if (msg.content.match(/^!пидордня/) || msg.content.match(/^!пидорня/)) {
    participantsRepository
      .IsParticipantExists(msg.author.id, msg.guild.id)
        .then(isExists => {
          if (isExists) {
            const response = msg.channel.send("Ты уже участвуешь в этой игре, чел");
            //ChatFunctions.temporaryMessage(msg.channel, "You're already participating in this game, silly", 7000);
          } else {
            participantsRepository.AddParticipant(msg.author.id, msg.guild.id, ChatFunctions.getNickname(msg));
            const response = msg.channel.send("Окей, ты в игре, " + ChatFunctions.getNickname(msg));
            //ChatFunctions.temporaryMessage(msg.channel, "Alright, you're in, " + ChatFunctions.getNickname(msg), 5000)
          }
        });
    ChatFunctions.deleteMessage(msg, 2000);
    return;
  }

  if (msg.content.match(/^!добавить/)) {
    let chunks = msg.content.slice(prefix.length).trim().split(/ +/g);
    if(msg.member.hasPermission("ADMINISTRATOR")){
      if(chunks[1] != undefined) {
        participantsRepository
          .IsParticipantExists(msg.mentions.members.first().id, msg.guild.id)
            .then(isExists => {
              if (isExists) {
                const response = msg.channel.send("Ты уже участвуешь в этой игре, чел");
                //ChatFunctions.temporaryMessage(msg.channel, "You're already participating in this game, silly", 7000);
              } else {
                participantsRepository.AddParticipant(msg.mentions.members.first().id, msg.guild.id, msg.mentions.members.first().displayName);
                const response = msg.channel.send("Окей, ты в игре, " + msg.mentions.members.first().displayName);
                //ChatFunctions.temporaryMessage(msg.channel, "Alright, you're in, " + ChatFunctions.getNickname(msg), 5000)
              }
            });
        ChatFunctions.deleteMessage(msg, 2000);
        return;
      }
    } else {
      msg.channel.send("У вас нет прав");
      return;
    }
  }

  if (msg.content.match(/^!ктопидор/)) {
    game.CanStartGame(msg.guild.id).then(() => {
      game.Run(msg.guild.id).then(async winMsg => {
        await game.Tease(msg.channel).then();
        msg.channel.send(winMsg);
      }, reject => {
        msg.channel.send(reject);
        //ChatFunctions.temporaryMessage(msg.channel, reject, 8000);
      });
    }, reject => {
      msg.channel.send("А пидор сегодня - " + reject);
    });

    ChatFunctions.deleteMessage(msg, 1000);
  }

  if (msg.content.match(/^!топпидоров/) || msg.content.match(/^!топ/)) {
    game.GetStats(msg.guild.id).then(message => {
      msg.channel.send(message);
      //ChatFunctions.temporaryMessage(msg.channel, message, 15000);
    });
    ChatFunctions.deleteMessage(msg, 1000);
    return;
  }

  if (msg.content.match(/^!исключить/)) {
    let chunks = msg.content.slice(prefix.length).trim().split(/ +/g);
    if(chunks[1] == undefined) {
      var discordId = msg.author.id;
    } else if(msg.member.hasPermission("ADMINISTRATOR")){
      var discordId = msg.mentions.members.first().id;
    } else {
      msg.channel.send("У вас нет прав");
      return;
    }

    participantsRepository.RemoveParticipant(discordId, msg.guild.id);
    msg.channel.send("Пользователь <@" + discordId + "> удалён из игры.");
    return;
  }
});

//DiscordClient.login(process.env.BOT_TOKEN).then(r => console.log('The bot has started!'));
DiscordClient.login(token);
