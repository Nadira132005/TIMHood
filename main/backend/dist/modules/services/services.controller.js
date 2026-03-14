"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesController = void 0;
const services_service_1 = require("./services.service");
exports.servicesController = {
    async getOverview(_req, res) {
        const result = await services_service_1.servicesService.getOverview();
        return res.status(200).json(result);
    }
};
