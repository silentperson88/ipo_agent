const path = require('path');
const config = require('../config');

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  try {
    mongoose = require(path.join(__dirname, '..', '..', 'tbs-server-development', 'node_modules', 'mongoose'));
  } catch (err) {
    console.warn('[Database] Mongoose not found in node_modules. Please run: npm install mongoose');
    mongoose = null;
  }
}

if (mongoose) {
  mongoose.set('strictQuery', false);
}

let IpoMaster = null;
let IpoDailyGmp = null;
let Subscriber = null;

if (mongoose) {
  // 1. Static Permanent Master Data
  const IpoMasterSchema = new mongoose.Schema({
    ipoId: { type: Number, unique: true, index: true },
    name: { type: String, required: true, index: true },
    symbol: String,
    category: { type: String, enum: ['Mainboard', 'SME'], default: 'Mainboard', index: true },
    sector: { type: String, index: true },
    price: Number,
    lotSize: Number,
    minInvestment: Number,
    issueSize: String,
    peRatio: Number,
    detailUrl: String,
    businessSummary: String,
    objectsOfIssue: String,
    prosAndCons: [String],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
  });

  IpoMasterSchema.index({ category: 1, name: 1 });
  IpoMasterSchema.index({ sector: 1, category: 1 });

  // 2. Dynamic Time-Series Daily GMP & Subscription Tracker
  const IpoDailyGmpSchema = new mongoose.Schema({
    ipoId: { type: Number, required: true, index: true },
    name: { type: String, required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    gmpAmount: { type: Number, default: 0 },
    gmpPercent: { type: Number, default: 0, index: true },
    lowGmp: { type: Number, default: 0 },
    highGmp: { type: Number, default: 0 },
    updatedOn: String, // e.g. "19-Aug 9:33"
    trendDirection: String,
    trendIcon: String,
    trendLabel: String,
    isDroppingNearClose: Boolean,
    isSurgingAtClose: Boolean,
    estListingPrice: Number,
    expectedProfitPerLot: { type: Number, default: 0, index: true },
    subscriptionRate: Number,
    subscriptionRaw: String,
    status: { type: String, index: true },
    dates: {
      open: String,
      close: String,
      allotment: String,
      listing: String,
      rawOpen: String,
      rawClose: String,
      rawBoA: String,
      rawListing: String
    },
    rating: Number,
    verdict: String,
    strategy: String,
    recordedAt: { type: Date, default: Date.now, index: true }
  });

  IpoDailyGmpSchema.index({ ipoId: 1, date: -1 }, { unique: true });
  IpoDailyGmpSchema.index({ date: -1, gmpPercent: -1 });
  IpoDailyGmpSchema.index({ date: -1, status: 1 });
  IpoDailyGmpSchema.index({ date: -1, expectedProfitPerLot: -1 });

  // 3. Paid Subscriber Model
  const SubscriberSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, index: true },
    name: String,
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'TRIAL'], default: 'ACTIVE', index: true },
    plan: { type: String, default: 'MONTHLY_50' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), index: true },
    minGmpFilter: { type: Number, default: 20 },
    receiveDailyDigest: { type: Boolean, default: true },
    receiveInstantAlerts: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  });

  SubscriberSchema.index({ status: 1, expiresAt: 1 });

  IpoMaster = mongoose.models.IpoMaster || mongoose.model('IpoMaster', IpoMasterSchema);
  IpoDailyGmp = mongoose.models.IpoDailyGmp || mongoose.model('IpoDailyGmp', IpoDailyGmpSchema);
  Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
}

let isConnected = false;

async function connectDb() {
  if (!mongoose) {
    console.log('[Database] Operating in file-based JSON cache mode.');
    return;
  }
  if (isConnected) return;
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DEV_DB_URL || config.mongo.uri || 'mongodb://127.0.0.1:27017/finvibes_ipo';
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 3000
    });
    isConnected = true;
    console.log(`[Database] Connected to MongoDB at ${mongoUri}`);
  } catch (err) {
    console.warn('[Database] MongoDB connection notice:', err.message);
  }
}

/**
 * High-speed Bulk Upsert into MongoDB
 */
async function syncIposToDb(analyzedIpos) {
  if (!mongoose) return;
  if (!isConnected) {
    await connectDb();
  }
  if (!isConnected) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const startTime = Date.now();

  try {
    const masterOps = [];
    const gmpOps = [];

    for (const ipo of analyzedIpos) {
      const identifier = ipo.id || ipo.name;
      const t = ipo.analysis?.transition || {};

      masterOps.push({
        updateOne: {
          filter: { ipoId: identifier },
          update: {
            $setOnInsert: {
              ipoId: ipo.id,
              name: ipo.name,
              category: ipo.category,
              sector: ipo.sector,
              price: ipo.priceBand?.price,
              lotSize: ipo.priceBand?.lotSize,
              minInvestment: ipo.priceBand?.minInvestment,
              issueSize: ipo.issueSize,
              peRatio: ipo.peRatio,
              detailUrl: ipo.detailUrl,
              createdAt: new Date()
            },
            $set: { updatedAt: new Date() }
          },
          upsert: true
        }
      });

      gmpOps.push({
        updateOne: {
          filter: { ipoId: identifier, date: todayStr },
          update: {
            $set: {
              name: ipo.name,
              gmpAmount: ipo.gmp?.amount || 0,
              gmpPercent: ipo.gmp?.percent || 0,
              lowGmp: ipo.gmp?.lowGmp !== undefined ? ipo.gmp.lowGmp : ipo.gmp?.amount,
              highGmp: ipo.gmp?.highGmp !== undefined ? ipo.gmp.highGmp : ipo.gmp?.amount,
              updatedOn: ipo.gmp?.updatedOn || 'Live',
              trendDirection: t.trendDirection || 'STABLE',
              trendIcon: t.trendIcon || '➡️',
              trendLabel: t.trendLabel || '',
              isDroppingNearClose: t.isDroppingNearClose || false,
              isSurgingAtClose: t.isSurgingAtClose || false,
              estListingPrice: ipo.gmp?.estListingPrice,
              expectedProfitPerLot: ipo.analysis?.expectedProfitPerLot || 0,
              subscriptionRate: ipo.subscription?.total,
              subscriptionRaw: ipo.subscription?.raw,
              status: ipo.status,
              dates: ipo.dates,
              rating: ipo.analysis?.rating,
              verdict: ipo.analysis?.verdict,
              strategy: ipo.analysis?.strategy,
              recordedAt: new Date()
            }
          },
          upsert: true
        }
      });
    }

    await Promise.all([
      IpoMaster.bulkWrite(masterOps, { ordered: false }),
      IpoDailyGmp.bulkWrite(gmpOps, { ordered: false })
    ]);

    const duration = Date.now() - startTime;
    console.log(`[Database] Bulk-synced ${analyzedIpos.length} IPOs to MongoDB in ${duration}ms (Indexes active).`);
  } catch (err) {
    console.error('[Database] Bulk sync error:', err.message);
  }
}

/**
 * Query live IPOs directly from MongoDB (sub-millisecond lean query)
 */
async function getLatestIposFromDb() {
  if (!isConnected) await connectDb();
  if (!isConnected) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const [gmps, masters] = await Promise.all([
      IpoDailyGmp.find({ date: todayStr }).lean(),
      IpoMaster.find({}).lean()
    ]);

    if (!gmps || gmps.length === 0) return null;

    const masterMap = new Map();
    masters.forEach(m => masterMap.set(String(m.ipoId), m));

    const ipos = gmps.map(g => {
      const m = masterMap.get(String(g.ipoId)) || {};
      return {
        id: g.ipoId,
        name: g.name,
        category: m.category || 'Mainboard',
        sector: m.sector || 'General',
        status: g.status,
        priceBand: {
          price: m.price,
          lotSize: m.lotSize,
          minInvestment: m.minInvestment
        },
        gmp: {
          amount: g.gmpAmount,
          percent: g.gmpPercent,
          lowGmp: g.lowGmp,
          highGmp: g.highGmp,
          updatedOn: g.updatedOn || 'Live',
          estListingPrice: g.estListingPrice
        },
        subscription: {
          total: g.subscriptionRate,
          raw: g.subscriptionRaw
        },
        issueSize: m.issueSize,
        peRatio: m.peRatio,
        dates: g.dates,
        detailUrl: m.detailUrl,
        analysis: {
          rating: g.rating,
          stars: '⭐'.repeat(Math.floor(g.rating || 3)),
          verdict: g.verdict,
          strategy: g.strategy,
          expectedProfitPerLot: g.expectedProfitPerLot,
          transition: {
            trendDirection: g.trendDirection || 'STABLE',
            trendIcon: g.trendIcon || '➡️',
            trendLabel: g.trendLabel || '',
            lowGmp: g.lowGmp,
            highGmp: g.highGmp,
            isDroppingNearClose: g.isDroppingNearClose,
            isSurgingAtClose: g.isSurgingAtClose
          }
        }
      };
    });

    return {
      scrapedAt: new Date().toISOString(),
      source: 'MongoDB',
      totalCount: ipos.length,
      openCount: ipos.filter(i => i.status === 'Open' || i.status === 'Closing Today').length,
      ipos
    };
  } catch (err) {
    console.error('[Database] Query error:', err.message);
    return null;
  }
}

/**
 * Get Time-Series GMP history for a specific IPO
 */
async function getIpoGmpHistory(ipoId, limitDays = 30) {
  if (!isConnected) await connectDb();
  if (!isConnected) return [];

  try {
    return await IpoDailyGmp.find({ ipoId })
      .sort({ date: 1 })
      .limit(limitDays)
      .lean();
  } catch (err) {
    console.error('[Database] History query error:', err.message);
    return [];
  }
}

/**
 * Fetch all active subscribers
 */
async function getActiveSubscribers() {
  if (!isConnected) await connectDb();
  if (!isConnected) return [];

  try {
    return await Subscriber.find({
      status: 'ACTIVE',
      expiresAt: { $gte: new Date() }
    }).lean();
  } catch (err) {
    console.error('[Database] Subscriber query error:', err.message);
    return [];
  }
}

module.exports = {
  connectDb,
  syncIposToDb,
  getLatestIposFromDb,
  getIpoGmpHistory,
  getActiveSubscribers,
  IpoMaster,
  IpoDailyGmp,
  Subscriber
};
