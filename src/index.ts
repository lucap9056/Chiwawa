import App from "@components/appManager";
import dotenv from "dotenv"; 
dotenv.config();


const app = new App();

const Stop = async () => {
    app.Stop().then(() => {
        process.exit(0);
    });
    setTimeout(() => {
        process.exit(1);
    }, 10 * 1000);
}

process.on('SIGINT', Stop);
process.on("SIGALRM", Stop);