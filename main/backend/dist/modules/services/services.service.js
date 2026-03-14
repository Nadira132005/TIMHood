"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesService = void 0;
const services_model_1 = require("./services.model");
exports.servicesService = {
    async getOverview() {
        const [services, applications, reviews] = await Promise.all([
            services_model_1.Service.countDocuments(),
            services_model_1.ServiceApplication.countDocuments(),
            services_model_1.ServiceReview.countDocuments()
        ]);
        return {
            module: 'services',
            status: 'ready',
            totals: { services, applications, reviews }
        };
    }
};
