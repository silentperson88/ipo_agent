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
let NotificationState = null;

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
    registrar: {
      name: String,
      url: String,
      bseUrl: String
    },
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

  // 4. Notification & Rate Limiting State Tracker
  const NotificationStateSchema = new mongoose.Schema({
    ipoId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    lastNotifiedGmpPercent: { type: Number, default: 0 },
    subMilestonesSent: { type: [Number], default: [] }, // [30, 50, 100]
    upcomingNotified: { type: Boolean, default: false },
    upcomingNotifiedT3Date: { type: String, default: '' },
    upcomingNotifiedT1Date: { type: String, default: '' },
    openNotifiedDate: { type: String, default: '' },
    finalAlertSentDate: { type: String, default: '' },
    closedRecapSentDate: { type: String, default: '' },
    listingNotifiedDate: { type: String, default: '' },
    instantAlertsSentToday: { type: Number, default: 0 },
    lastAlertDate: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  });

  IpoMaster = mongoose.models.IpoMaster || mongoose.model('IpoMaster', IpoMasterSchema);
  IpoDailyGmp = mongoose.models.IpoDailyGmp || mongoose.model('IpoDailyGmp', IpoDailyGmpSchema);
  Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
  NotificationState = mongoose.models.NotificationState || mongoose.model('NotificationState', NotificationStateSchema);
}

let isConnected = false;

async function connectDb() {
  if (!mongoose) {
    console.error('[Database] ❌ Mongoose is not available in environment. Please install mongoose.');
    return false;
  }
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  const mongoUri = process.env.MONGO_URI || config.mongo?.uri || 'mongodb://127.0.0.1:27017/run4dream_ipoagent';
  try {
    console.log(`[Database] 🔄 Connecting to MongoDB at: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}...`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    isConnected = true;
    const dbName = mongoose.connection.name || 'run4dream_ipoagent';
    const host = mongoose.connection.host || 'localhost';
    const port = mongoose.connection.port || 27017;

    let masterCount = 0;
    let gmpCount = 0;
    try {
      if (IpoMaster) masterCount = await IpoMaster.countDocuments();
      if (IpoDailyGmp) gmpCount = await IpoDailyGmp.countDocuments();
    } catch (e) {}

    console.log(`[Database] ✅ Connected to MongoDB successfully!`);
    console.log(`[Database] 📦 Database: "${dbName}" | Host: ${host}:${port} | Master IPOs: ${masterCount} | Daily GMP Records: ${gmpCount}`);
    return true;
  } catch (err) {
    isConnected = false;
    console.error(`[Database] ❌ MongoDB Connection FAILED: ${err.message}`);
    console.error(`[Database] 💡 Check: Is MongoDB daemon running locally on port 27017 or is MONGO_URI reachable?`);
    return false;
  }
}

/**
 * High-speed Bulk Upsert into MongoDB
 */
async function syncIposToDb(analyzedIpos) {
  if (!mongoose) return;
  if (!isConnected || mongoose.connection.readyState !== 1) {
    await connectDb();
  }
  if (!isConnected || mongoose.connection.readyState !== 1) return;

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
              issueSize: ipo.issueSize,
              peRatio: ipo.peRatio,
              detailUrl: ipo.detailUrl,
              createdAt: new Date()
            },
            $set: { 
              updatedAt: new Date(),
              price: ipo.priceBand?.price,
              lotSize: ipo.priceBand?.lotSize,
              minInvestment: ipo.priceBand?.minInvestment,
              registrar: ipo.registrar || null
            }
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
 * Automatically falls back to the most recent date available in DB if today's sync hasn't run yet.
 */
async function getLatestIposFromDb() {
  if (!isConnected || mongoose.connection.readyState !== 1) await connectDb();
  if (!isConnected || mongoose.connection.readyState !== 1) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 1. Check if today's data exists; if not, query latest available date
    let queryDate = todayStr;
    const hasToday = await IpoDailyGmp.exists({ date: todayStr });
    if (!hasToday) {
      const latestRecord = await IpoDailyGmp.findOne({}).sort({ date: -1 }).select('date').lean();
      if (latestRecord) {
        queryDate = latestRecord.date;
      }
    }

    const [gmps, masters] = await Promise.all([
      IpoDailyGmp.find({ date: queryDate }).lean(),
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
        registrar: m.registrar || null,
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
      targetDate: queryDate,
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
  if (!isConnected || mongoose.connection.readyState !== 1) await connectDb();
  if (!isConnected || mongoose.connection.readyState !== 1) return [];

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
 * Fetch IPOs by specific status (e.g. 'Open', 'Closing Today', 'Upcoming')
 */
async function getIposByStatus(status) {
  const latest = await getLatestIposFromDb();
  if (!latest || !latest.ipos) return [];
  return latest.ipos.filter(i => i.status === status);
}

/**
 * Fetch single IPO by ID
 */
async function getIpoById(ipoId) {
  const latest = await getLatestIposFromDb();
  if (!latest || !latest.ipos) return null;
  return latest.ipos.find(i => String(i.id) === String(ipoId)) || null;
}

/**
 * Fetch all active subscribers
 */
async function getActiveSubscribers() {
  if (!isConnected || mongoose.connection.readyState !== 1) await connectDb();
  if (!isConnected || mongoose.connection.readyState !== 1) return [];

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
  getIposByStatus,
  getIpoById,
  getActiveSubscribers,
  IpoMaster,
  IpoDailyGmp,
  Subscriber,
  NotificationState,
  mongoose
};
