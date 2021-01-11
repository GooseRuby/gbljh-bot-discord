
class Settings {
    constructor(dbsAdapter, settingsRepository) {
        this.dbsAdapter = dbsAdapter;
        this.settingsRepository = settingsRepository;
    }

    async IsGuildSub(guild_id) {
        return new Promise((resolve, reject) => {
            this.settingsRepository
                .GetSub(guild_id)
                  .then(issub => {
                    if (issub === undefined) {
                        resolve(false);
                    } else if (issub.is_sub == 0) {
                        resolve(false);
                    } else if (issub.is_sub == 1) {
                        resolve(true);
                    }
                });
        });
    }

    async Sub(guild_id) {
        return new Promise((resolve, reject) => {
            this.settingsRepository.IsGuildSub(guild_id).then(isSub => {
                if (isSub === null) {
                    reject("ошибочка");
                    return;
                }


                resolve(isSub.is_sub);
            });
        });
    }


/*

    async CanStartGame(guild_id) {
      //var inputDate = game.datetime;
      //var todaysDate = new Date();
        return new Promise((resolve, reject) => {
            this.gamesRepository
                .GetLastGame(guild_id)
                .then(game => {
                    if (game === undefined) {
                        resolve(true);
                    } else
                    if (game.datetime == new Date().setHours(0,0,0,0)) {
                        reject(game.discord_user_name);
                        return;
                    }

                    resolve(true);
                });
        });
    }

    async Tease(channel) {
        let phrases = Misc.GetRandomElement(teasePhrases);
        await Misc.AsyncForEach(phrases, async p => {
            await Misc.Sleep(2500 + Math.random() * 5500).then(() => {
                channel.send(p);
            });
        });
        await Misc.Sleep(3500 + Math.random() * 2500)
    }

    async Run(guild_id) {
        return new Promise((resolve, reject) => {
            this.participantRepository.GetRandomParticipant(guild_id).then(participant => {
                if (participant === null) {
                    reject("Вы не можете запустить игру без участников");
                    return;
                }

                this.gamesRepository.SaveGameInformation(guild_id, participant.id);
                this.participantRepository.ScoreParticipant(participant.id);
                resolve(Misc.GetRandomElement(resultPhrases) + "<@" + participant.discord_user_id + ">");
            });
        });
    }

    GetStats(guild_id) {
        return new Promise(resolve => {
            this.dbAdapter
                .all(
                    "SELECT discord_user_name, score FROM participants WHERE score > 0 AND discord_guild_id = ?1 ORDER BY score DESC LIMIT 10",
                    {
                        1: guild_id,
                    })
                .then(rows => {
                    let string = "**Топ-10 пидоров за все время:**\n";
                    rows.forEach((row) => {
                        string += row.discord_user_name+" - " + row.score + "\n";
                    });

                    resolve(string);
                });
        });
    }*/
}

module.exports = Settings;
