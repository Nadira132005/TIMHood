"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const notifications_controller_1 = require("./notifications.controller");
exports.notificationsRouter = (0, express_1.Router)();
exports.notificationsRouter.get('/', (0, async_handler_1.asyncHandler)(notifications_controller_1.notificationsController.getOverview));
