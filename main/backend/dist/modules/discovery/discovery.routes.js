"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoveryRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const discovery_controller_1 = require("./discovery.controller");
exports.discoveryRouter = (0, express_1.Router)();
exports.discoveryRouter.get('/', (0, async_handler_1.asyncHandler)(discovery_controller_1.discoveryController.getOverview));
