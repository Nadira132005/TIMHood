"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityController = void 0;
const identity_service_1 = require("./identity.service");
exports.identityController = {
    async getProofStatus(req, res) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const status = await identity_service_1.identityService.getProofStatus(userId);
        if (!status) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json(status);
    },
    async submitProofOfWork(req, res) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const documentNumber = req.body?.document_number;
        if (typeof documentNumber !== 'string') {
            return res.status(400).json({ error: 'document_number is required' });
        }
        const result = await identity_service_1.identityService.submitProofOfWork(userId, documentNumber);
        return res.status(200).json(result);
    },
    async upsertLocations(req, res) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const home = req.body?.home_location_point;
        if (!home || home.type !== 'Point' || !Array.isArray(home.coordinates) || home.coordinates.length !== 2) {
            return res.status(400).json({ error: 'home_location_point GeoJSON Point is required' });
        }
        const saved = await identity_service_1.identityService.upsertLocations(userId, req.body);
        return res.status(200).json(saved);
    }
};
