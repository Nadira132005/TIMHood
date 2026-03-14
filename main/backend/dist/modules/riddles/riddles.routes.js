"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riddlesRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const riddles_controller_1 = require("./riddles.controller");
exports.riddlesRouter = (0, express_1.Router)();
exports.riddlesRouter.get('/', (0, async_handler_1.asyncHandler)(riddles_controller_1.riddlesController.getOverview));
