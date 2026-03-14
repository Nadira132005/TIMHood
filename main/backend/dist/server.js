"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
async function bootstrap() {
    await (0, db_1.connectDb)();
    const app = (0, app_1.buildApp)();
    app.listen(env_1.env.port, () => {
        console.log(`Backend listening on port ${env_1.env.port}`);
    });
}
bootstrap().catch((error) => {
    console.error('Failed to start backend', error);
    process.exit(1);
});
