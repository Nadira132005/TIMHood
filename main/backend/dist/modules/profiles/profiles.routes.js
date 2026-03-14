"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const profiles_controller_1 = require("./profiles.controller");
exports.profilesRouter = (0, express_1.Router)();
exports.profilesRouter.get('/', (0, async_handler_1.asyncHandler)(profiles_controller_1.profilesController.getOverview));
