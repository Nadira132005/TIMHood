"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 4000),
    mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timhood',
    frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:8081'
};
