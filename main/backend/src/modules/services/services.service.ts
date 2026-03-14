import { Service, ServiceApplication, ServiceReview } from './services.model';

export const servicesService = {
  async getOverview() {
    const [services, applications, reviews] = await Promise.all([
      Service.countDocuments(),
      ServiceApplication.countDocuments(),
      ServiceReview.countDocuments()
    ]);

    return {
      module: 'services',
      status: 'ready',
      totals: { services, applications, reviews }
    };
  }
};
