"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const services_controller_1 = require("./services.controller");
exports.servicesRouter = (0, express_1.Router)();
exports.servicesRouter.get('/', (0, async_handler_1.asyncHandler)(services_controller_1.servicesController.getOverview));
