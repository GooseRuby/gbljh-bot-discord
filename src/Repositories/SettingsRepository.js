class SettingsRepository {
    constructor(dbsAdapter) {
        this.dbsAdapter = dbsAdapter;
    }

    CreateNewSettings(guild_id, def_ch) {
      this.dbsAdapter.run(
          "INSERT INTO setlist (discord_guild_id, default_channel) VALUES (?1, ?2)",
          {
              1: guild_id,
              2: def_ch
          }
      );
    }

    IsGuildExists(guild_id) {
      return this.dbsAdapter.get(
          "SELECT count(id) as cnt FROM setlist WHERE discord_guild_id = ?1",
          {
              1: guild_id
          },
      ).then(result => {
          return result.cnt > 0;
      });
    }

    async GetSub(guild_id) { //хз зачем он так же не особо нужен но пусть будет вдруг пригодится
      return this.dbsAdapter.get(
          "SELECT is_sub FROM setlist WHERE discord_guild_id = ?1",
          {
              1: guild_id
          },
      ).then(result => {
        if (result === undefined) {
            return null;
        }

        return result;
      });
    }

    async GetDefCh(guild_id) {
      return this.dbsAdapter.get(
          "SELECT default_channel FROM setlist WHERE discord_guild_id = ?1",
          {
              1: guild_id
          },
      ).then(result => {
        if (result === undefined) {
            return null;
        }

        return result.default_channel;
      });
    }

    SetDefCh(guild_id, newch_id) {
      this.dbsAdapter.run(
        "UPDATE setlist SET default_channel = ?2 WHERE discord_guild_id = ?1",
        {
            1: guild_id,
            2: newch_id
        }
      );
    }
}

module.exports = SettingsRepository;
