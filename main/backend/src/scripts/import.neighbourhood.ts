import { loadNeighborhoodImportRows } from "../modules/neighborhoods/utils";
import { Neighborhood } from "../modules/neighborhoods/neighborhoods.model";

export async function importNeighborhoods(): Promise<void> {
  const rows = loadNeighborhoodImportRows();

  await Promise.all(
    rows.map((row) =>
      Neighborhood.findOneAndUpdate(
        { source_id: row.sourceId },
        {
          $set: {
            source_id: row.sourceId,
            name: row.name,
            slug: row.slug,
            description: row.description,
            geometry: row.geometry,
            center: row.center,
          },
          $setOnInsert: {
            _id: row.id,
          },
        },
        {
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      ),
    ),
  );
}

import mongoose from "mongoose";
import dotenv from "dotenv";
import { join } from "path";

console.log(dotenv.config({ path: join(__dirname, "../../.env") }));

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("Connected to MongoDB");
  console.log("Importing neighborhoods...");

  await importNeighborhoods();

  console.log("Import finished");
  await mongoose.disconnect();
  console.log("Disconnected");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
