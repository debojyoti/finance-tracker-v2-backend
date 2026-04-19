/**
 * One-time migration: backfill reportingMode and entryPurpose on existing ExpenseTransaction documents.
 *
 * Run once before releasing the reporting-mode feature.
 * Safe to run multiple times — skips documents that already have values set.
 *
 * Usage:
 *   node scripts/backfill-expense-reporting-fields.js
 *
 * Requires MONGODB_URI in environment (same as the main app).
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const collection = mongoose.connection.collection('expensetransactions');

  const filter = {
    $or: [
      { reportingMode: { $exists: false } },
      { entryPurpose: { $exists: false } }
    ]
  };

  const matched = await collection.countDocuments(filter);
  console.log(`Documents missing reportingMode or entryPurpose: ${matched}`);

  if (matched === 0) {
    console.log('Nothing to migrate. Exiting.');
    await mongoose.disconnect();
    return;
  }

  const result = await collection.updateMany(
    filter,
    [
      {
        $set: {
          reportingMode: {
            $cond: [
              { $not: ['$reportingMode'] },
              'standard',
              '$reportingMode'
            ]
          },
          entryPurpose: {
            $cond: [
              { $not: ['$entryPurpose'] },
              'regular',
              '$entryPurpose'
            ]
          }
        }
      }
    ]
  );

  console.log(`Documents matched: ${result.matchedCount}`);
  console.log(`Documents modified: ${result.modifiedCount}`);
  console.log('Migration complete.');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
