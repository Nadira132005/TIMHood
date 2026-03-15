import { connectDb } from '../config/db';
import { User } from '../modules/identity/identity.model';
import { buildInitialsAvatar, getAvatarLabel, isGeneratedAvatarDataUri } from '../shared/utils/avatar';

async function run() {
  await connectDb();

  const users = await User.find({})
    .select('_id full_name first_name last_name profile_photo_base64 verified_profile_photo_base64 avatar_photo_base64')
    .lean();

  if (!users.length) {
    console.log('No users found.');
    return;
  }

  const operations = users.map((user) => {
    const label = getAvatarLabel({
      fullName: user.full_name,
      firstName: user.first_name,
      lastName: user.last_name,
      fallbackLabel: String(user._id)
    });

    const legacyPhoto = user.profile_photo_base64?.trim() || undefined;
    const verifiedPhoto =
      user.verified_profile_photo_base64?.trim() ||
      (legacyPhoto && !isGeneratedAvatarDataUri(legacyPhoto) ? legacyPhoto : undefined);
    const avatarPhoto = user.avatar_photo_base64?.trim() || buildInitialsAvatar(label);

    return {
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            verified_profile_photo_base64: verifiedPhoto,
            avatar_photo_base64: avatarPhoto,
            profile_photo_base64: verifiedPhoto || avatarPhoto
          }
        }
      }
    };
  });

  await User.bulkWrite(operations);
  console.log(`Synchronized profile photos for ${operations.length} user(s).`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Profile photo sync failed', error);
    process.exit(1);
  });
