import { Router } from "express";

import { identityRouter } from "./identity/identity.routes";
import { neighborhoodsRouter } from "./neighborhoods/neighborhoods.routes";

export const apiRouter = Router();

apiRouter.use("/identity", identityRouter);
apiRouter.use("/neighborhoods", neighborhoodsRouter);
