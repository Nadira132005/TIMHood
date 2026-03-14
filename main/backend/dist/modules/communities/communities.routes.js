"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communitiesRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../shared/utils/async-handler");
const communities_controller_1 = require("./communities.controller");
exports.communitiesRouter = (0, express_1.Router)();
exports.communitiesRouter.get('/', (0, async_handler_1.asyncHandler)(communities_controller_1.communitiesController.getOverview));
