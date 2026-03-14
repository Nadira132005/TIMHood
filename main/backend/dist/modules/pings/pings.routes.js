"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingsRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const pings_controller_1 = require("./pings.controller");
exports.pingsRouter = (0, express_1.Router)();
exports.pingsRouter.get('/', (0, async_handler_1.asyncHandler)(pings_controller_1.pingsController.getOverview));
