"use strict";
//require('dotenv').config();
let config = require("./botconfig.json");
let token = config.token;
let prefix = config.prefix;

const DiscordJS = require("discord.js");
const sqlite3 = require("sqlite3");
const DiscordClient = new DiscordJS.Client();
const ChatFunctions = require("./src/ChatFunctions");
const GamesRepository = require("./src/Repositories/GamesRepository");
const ParticipantRepository = require("./src/Repositories/ParticipantRepository");
const Game = require("./src/Game");
const DbAdapter = require("./src/DbAdapter");

const db = new sqlite3.Database('database.db3');
const dbAdapter = new DbAdapter(db);
const gamesRepository = new GamesRepository(dbAdapter);
const participantsRepository = new ParticipantRepository(dbAdapter);
const game = new Game(dbAdapter, participantsRepository, gamesRepository);

DiscordClient.on('ready', () => {
  console.log(`готов вкалывать`)
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
        /*let chunks = msg.content.slice(prefix.length).trim().split(/ +/g);
        if(chunks[1] != undefined) {

        }*/
        let discordId = msg.mentions.members.first().id;
        //let chunks = msg.content.slice(prefix.length).trim().split(/ +/g);
        //let chunks = msg.message.split(' ');
        //chunks.splice(0, 1);
        //let discordId = chunks[0];

        msg.channel.send("Ок");

        participantsRepository.RemoveParticipant(discordId, msg.guild.id);
        return;
    }
});

//DiscordClient.login(process.env.BOT_TOKEN).then(r => console.log('The bot has started!'));
DiscordClient.login(token);
