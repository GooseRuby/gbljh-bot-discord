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
  DiscordClient.user.setPresence({
        status: 'online',
        activity: {
            type: `WATCHING`,
            name: `за ${DiscordClient.guilds.cache.size} серверами`,
        },
    });
})

Cron.schedule('0 0 0 * * *', () => { //АВТОПИДОР
  settings.GetSubGuilds().then(array => {
    console.log(`Список серверов с подпиской:`);
    console.log(array);
    array.forEach((item, i) => {
      console.log(`Запушено автосообщение на сервере \'` + item.id + `\', на канале \'` + item.defch + `\'.`);

      game.CanStartGame(item.id).then(() => { //функция пидора (неожиданно да)
        game.Run(item.id).then(async winMsg => {
          await game.Tease(DiscordClient.channels.cache.get(item.defch)).then();
          DiscordClient.channels.cache.get(item.defch).send(winMsg);
        }, reject => {
          DiscordClient.channels.cache.get(item.defch).send(reject);
        });
      }, reject => {
        DiscordClient.channels.cache.get(item.defch).send("А пидор сегодня - " + reject);
      });
    });
  });
})


DiscordClient.on('guildCreate', guild => {
  let myAvatarURL = 'https://images-ext-1.discordapp.net/external/Y0x5z86Vwx6_m6cbFHGLvFlovc7R0TW1RaGYnmBeq_Y/https/cdn.discordapp.com/avatars/188189518921334784/90a4a79ac996384954c06b9d468fc999.webp';
  const helloEmbed = new DiscordJS.MessageEmbed()
    .setColor('#FF6699')
    .setTitle('Привет!')
    .setDescription(`Спасибо за спользование бота! Добавляйтесь в игру командой "!пидордня" и запускайте рулетку "!ктопидор"
      Если вам нужна доп. помощь напишите "!п помощь"
      Подписывайтесь на группу бота вк: https://vk.com/gayoftheday_dc`)
    .setFooter("Автор: Гусик#9344", myAvatarURL );

  let defaultChannel = "";


  let guild_id = guild.id;

  settingsRepository
    .IsGuildExists(guild_id).then(isExists => {
      if (isExists) {
        settingsRepository
          .GetDefCh(guild.id)
            .then(defch => {
              console.log(`Сервер ` + guild_id + ` уже существует, настройки восстановлены. Дефолтный канал - ` + defch);
              DiscordClient.channels.cache.get(defch).send(helloEmbed);
            });
      } else {
        guild.channels.cache.forEach((channel) => {
          if(channel.type == "text" && defaultChannel == "") {
            if(channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
              defaultChannel = channel;
            }
          }
        });

        let def_ch = defaultChannel.id;
        settingsRepository.CreateNewSettings(guild_id, def_ch);
        console.log(`Сервер ` + guild_id + ` успешно инициализирован.`);

        //defaultChannel will be the channel object that the bot first finds permissions for
        defaultChannel.send(helloEmbed);
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

  if (msg.content.match(/^!п команды/) || msg.content.match(/^!п помощь/)) {
    let myAvatarURL = 'https://images-ext-1.discordapp.net/external/Y0x5z86Vwx6_m6cbFHGLvFlovc7R0TW1RaGYnmBeq_Y/https/cdn.discordapp.com/avatars/188189518921334784/90a4a79ac996384954c06b9d468fc999.webp';
    const helpEmbed = new DiscordJS.MessageEmbed()
      .setColor('#FF6699')
	    .setTitle('Помощь')
	    .setDescription(`Этот бот создан для игры "пидордня". Раз в день вы можете запустить рандомный выбор сегодняшнего "счастливчика".
      Группа вк: https://vk.com/gayoftheday_dc

      Список команд доступных для бота:`)
	    .addFields(
		      { name: '!пидордня', value: '- участвовать в игре' },
          { name: '!ктопидор', value: '- запустить игру (или узнать кто уже был сегодня выбран)' },
          { name: '!топ или !топпидоров', value: '- вывести топ 10 на этом сервере' },
          { name: '!исключить', value: '- убрать себя из участников (очки обнуляются!)' },
          { name: '!п команды', value: '- вывести это окно с помощью' },
          { name: '!п подписка', value: '- узнать для чего нужна подписка' },
          { name: '\u200B', value: 'Доступное только админам:' },
          { name: '!добавить [тег]', value: '- добавить тегнутого в список участников' },
          { name: '!исключить [тег]', value: '- убрать тегнутого из участников (очки обнуляются!)' },
          { name: '!п канал [тег канала]', value: '- изменить канал в котором будет выводится авто-сообщения (только для подписчиков)' },
          { name: '\u200B', value: '\u200B' },
          { name: 'Дисклеймер:', value: 'Автор бота не преследует цели оскорбить кого-то или высмеять людей с нетрадиционной секусуальной ориентацией. Все выражения используются в ироническом контексте.' }
	    )
	    .setFooter("Автор: Гусик#9344", myAvatarURL );

    msg.channel.send(helpEmbed);
  }

  if (msg.content.match(/^!п канал/)) {
    let chunks = msg.content.slice(prefix.length).trim().split(/ +/g);
    if(msg.member.hasPermission("ADMINISTRATOR")){
      if(chunks[2] != undefined) {
        let defch = msg.mentions.channels.first().id;
        settingsRepository
          .IsGuildExists(msg.guild.id).then(isExists => {
            if (isExists) {
              settingsRepository.SetDefCh(msg.guild.id, defch);
              console.log(`На сервере ` + msg.guild.id + ` дефолтный канал изменён на - ` + defch);
              msg.channel.send(`Авто-сообщения теперь будут выводиться на канале - <#` + defch + `>`);
            }
          })
        } else {
          settingsRepository
            .GetDefCh(msg.guild.id)
              .then(defch => {
                msg.channel.send(`Сейчас сообщения выводятся на канале - <#` + defch + `>
Если хотите изменить канал, то напишите "!п канал [тег канала]" (без квадратных скобок)`);
              });
        }
      } else {
        msg.channel.send("У вас нет прав");
        return;
      }
    }


  if (msg.content.match(/^!п подписка/)) {
    let myAvatarURL = 'https://images-ext-1.discordapp.net/external/Y0x5z86Vwx6_m6cbFHGLvFlovc7R0TW1RaGYnmBeq_Y/https/cdn.discordapp.com/avatars/188189518921334784/90a4a79ac996384954c06b9d468fc999.webp';
    const subEmbed = new DiscordJS.MessageEmbed()
      .setColor('#FF6699')
	    .setTitle('Подписка')
	    .setDescription(`Подписка стоит 50 р/месяц и даёт некоторые преимущества. Её можно отключить в любой момент. Купить её можно в группе вк: https://vk.com/gayoftheday_dc через сервис VK Donut. Если есть вопросы - пишите в группе или мне в лс в дискорде (мой тег внизу этого сообщения)

      Преимущества подписки:`)
	    .addFields(
		      { name: 'Автопидор', value: 'Автоматически в 00:00 по МСК запускает !ктопидор . Теперь вам не придётся жалеть, если вы пропустили день и забыли прописать команду! Вы сможете выбрать на какой канал бот будет писать эти автосообщения' },
	    )
	    .setFooter("Автор: Гусик#9344", myAvatarURL );

    msg.channel.send(subEmbed);
  }
});

//DiscordClient.login(process.env.BOT_TOKEN).then(r => console.log('The bot has started!'));
DiscordClient.login(token);
