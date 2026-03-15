import { Router } from "express";

import { communitiesRouter } from "./communities/communities.routes";
import { identityRouter } from "./identity/identity.routes";
import { neighborhoodsRouter } from "./neighborhoods/neighborhoods.routes";
import { socialRouter } from "./social/social.routes";

export const apiRouter = Router();

apiRouter.use("/communities", communitiesRouter);
apiRouter.use("/identity", identityRouter);
apiRouter.use("/neighborhoods", neighborhoodsRouter);
apiRouter.use("/social", socialRouter);
