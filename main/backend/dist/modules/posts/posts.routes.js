"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postsRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const posts_controller_1 = require("./posts.controller");
exports.postsRouter = (0, express_1.Router)();
exports.postsRouter.get('/', (0, async_handler_1.asyncHandler)(posts_controller_1.postsController.getOverview));
