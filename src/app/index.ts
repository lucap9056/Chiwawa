import APIServer from "/lib/api-server";
import MongoDB from "/lib/database";
import Bot from "/lib/discord-bot";
import Config from "/lib/config";


class App {
    public config: Config;
    public mongoDB: MongoDB;
    public bot: Bot;
    public apiServer?: APIServer;

    constructor() {
        const config = new Config();

        const mongoDB = new MongoDB();

        if (config.database.isEnabled) {
            mongoDB.Init(config.database).then(() => {
                console.log("Database Ready");
            }).catch((err: any) => {
                console.error(err);
                config.database.isEnabled = false;
            });
        }

        const bot = new Bot(config, mongoDB);


        this.config = config;
        this.mongoDB = mongoDB;
        this.bot = bot;

        if (config.api.isEnabled) {
            this.apiServer = new APIServer(this);
        }

        console.log("TTS: ", App.OptionStateText(config.discord.tts.isEnabled));
        console.log("Database: " + App.OptionStateText(config.database.isEnabled));
        console.log("APIServer: " + App.OptionStateText(config.api.isEnabled));
        console.log("APIServer_OAuth2: " + App.OptionStateText(config.api.oauth2.isEnabled));
    }

    public static OptionStateText(option: boolean): string {
        return option ? "\x1b[32mtrue\x1b[0m" : "\x1b[31mfalse\x1b[0m";
    }

    public async Stop(): Promise<void> {

        const awaiting: Promise<any>[] = [];

        awaiting.push(this.bot.Destroy());

        if (this.apiServer) {
            awaiting.push(this.apiServer.Close());
        }

        await Promise.all(awaiting);
    }

    public async Restart(): Promise<void> {
        console.log("Restarting...");

        this.Stop().then(() => {

            const app = new App();
            Object.assign(this, app);

        }).catch(console.error);

    }
}

export default App;