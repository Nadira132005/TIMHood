"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const events_controller_1 = require("./events.controller");
exports.eventsRouter = (0, express_1.Router)();
exports.eventsRouter.get('/', (0, async_handler_1.asyncHandler)(events_controller_1.eventsController.getOverview));
