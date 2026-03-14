import { Router } from 'express';

import { communitiesRouter } from './communities/communities.routes';
import { discoveryRouter } from './discovery/discovery.routes';
import { eventsRouter } from './events/events.routes';
import { identityRouter } from './identity/identity.routes';
import { neighborhoodsRouter } from './neighborhoods/neighborhoods.routes';
import { notificationsRouter } from './notifications/notifications.routes';
import { pingsRouter } from './pings/pings.routes';
import { postsRouter } from './posts/posts.routes';
import { profilesRouter } from './profiles/profiles.routes';
import { riddlesRouter } from './riddles/riddles.routes';
import { servicesRouter } from './services/services.routes';
import { socialRouter } from './social/social.routes';

export const apiRouter = Router();

apiRouter.use('/identity', identityRouter);
apiRouter.use('/neighborhoods', neighborhoodsRouter);
apiRouter.use('/communities', communitiesRouter);
apiRouter.use('/posts', postsRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/pings', pingsRouter);
apiRouter.use('/services', servicesRouter);
apiRouter.use('/social', socialRouter);
apiRouter.use('/profiles', profilesRouter);
apiRouter.use('/riddles', riddlesRouter);
apiRouter.use('/discovery', discoveryRouter);
apiRouter.use('/notifications', notificationsRouter);
