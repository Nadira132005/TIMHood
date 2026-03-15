import { Community } from './communities.model';

const LEGACY_GROUP_KEY_INDEX_NAME = 'neighborhood_name_1_group_key_1';
const STANDARD_GROUP_KEY_INDEX_NAME = 'community_standard_group_key_unique';

export async function ensureCommunityIndexes(): Promise<void> {
  const indexes = await Community.collection.indexes();
  const hasLegacyIndex = indexes.some((index) => index.name === LEGACY_GROUP_KEY_INDEX_NAME);

  if (hasLegacyIndex) {
    await Community.collection.dropIndex(LEGACY_GROUP_KEY_INDEX_NAME);
  }

  const hasTargetIndex = indexes.some((index) => index.name === STANDARD_GROUP_KEY_INDEX_NAME);
  if (!hasTargetIndex || hasLegacyIndex) {
    await Community.collection.createIndex(
      { neighborhood_name: 1, group_key: 1 },
      {
        name: STANDARD_GROUP_KEY_INDEX_NAME,
        unique: true,
        partialFilterExpression: {
          group_kind: 'standard',
          neighborhood_name: { $exists: true, $type: 'string' },
          group_key: { $exists: true, $type: 'string' }
        }
      }
    );
  }
}
