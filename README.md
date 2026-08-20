# 🚀 Run4Dream IPO Intelligence Agent

> **Autonomous AI-Powered IPO Intelligence, Grey Market Telemetry, Lifecycle Decision Engine & Automated WhatsApp Broadcast System.**

---

## 🌟 Executive Summary

**Run4Dream IPO Intelligence Agent** is an enterprise-grade autonomous system built to track Indian Mainboard and SME Initial Public Offerings (IPOs) in real-time. It ingests live grey market quotes, evaluates institutional bidding velocity, analyzes price bands, assigns risk-weighted **Apply or Avoid** decisions, and autonomously broadcasts high-impact, scannable intelligence cards to your WhatsApp community.

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                SYSTEM ARCHITECTURE FLOW                               │
└───────────────────────────────────────────────────────────────────────────────────────┘
  [ InvestorGain / Exchange APIs ] ──> Direct JSON Telemetry (GMP, Subscriptions, Dates)
                 │
                 ▼
     [ services/fetcher.js ] ────────> Strict Lifecycle Classification & Retention Filters
                 │                     (Listed ≤ 7 Days | Upcoming ≤ 15 Days)
                 ▼
   [ services/aiAnalyzer.js ] ───────> Percentage-Based Momentum Engine (Apply / Avoid Calls)
                 │
                 ▼
     [ services/dbService.js ] ──────> MongoDB Single Source of Truth (SSOT)
                                       ├── IpoMaster (Permanent Specs & RTAs)
                                       ├── IpoDailyGmp (Time-Series & Decisions)
                                       └── NotificationState (Milestones & Caps)
                 │
         ┌───────┴───────────────────────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│   SERVICE 1: WEB DASHBOARD UI   │         │  SERVICE 2: 24/7 CRON SCHEDULER │
│      [ dashboard/server.js ]    │         │      [ services/scheduler.js ]  │
│  • Pure Web/API on Port 5050    │         │  • node-cron Engine (Asia/Calcutta)
│  • Zero WhatsApp dependency     │         │  • Ingests & AI Evaluates Live  │
│  • Command: npm run dashboard   │         │  • Auto-Dispatches WhatsApp     │
└─────────────────────────────────┘         │  • Command: npm run schedule    │
                                            └─────────────────────────────────┘
                                                             │
                                                             ▼
                                                [ services/whatsappBot.js ]
                                                  Permanent Multi-File Auth
                                                  (data/whatsapp_session/)
```

---

## 🏛️ System Modules & "Who Does What"

| Module / File | Responsibility & Description | Key Tools / Dependencies |
| :--- | :--- | :--- |
| **`index.js`** | Master pipeline orchestrator. Executes ingestion, AI analysis, database synchronization, and template formatting. | Node.js Runtime |
| **`services/fetcher.js`** | Fetches live IPOs directly from internal cloud report endpoints (`msg: 1`). Normalizes price bands, lot sizes, subscription multiples, and applies 7-day listed / 15-day upcoming retention rules. | Native `fetch`, Regex Data Sanitizer |
| **`services/aiAnalyzer.js`** | Evaluates GMP percentage growth/drop transitions, expected lot profit, risk tiers, and lifecycle-aware ratings (1.0 to 5.0 stars). Never flags upcoming IPOs as Avoid. | Mathematical Model |
| **`services/allotmentService.js`** | Resolves the designated SEBI-registered registrar (*Link Intime*, *KFintech*, *Bigshare*, *Maashitla*, *Skyline*, *Purva*) and generates direct 1-click verification links alongside the BSE Universal portal. | RTA Registry Engine |
| **`services/whatsappBot.js`** | Self-hosted WhatsApp automation socket. Handles QR code pairing, multi-file session recovery, community announcement broadcasting, and interactive user auto-replies. | `@whiskeysockets/baileys`, `qrcode-terminal` |
| **`services/notificationEngine.js`** | Event-driven state manager. Tracks notification history in MongoDB, enforces the **Max 2 Instant Alerts/Day** cap, and triggers on $\ge 5\%$ GMP breakout shifts. | Mongoose Models |
| **`services/scheduler.js`** | 24/7 cron dispatcher. Triggers 08:30 AM Kickoffs, 02:00 PM Action Alerts, 07:00 PM Scorecards, 09:00 PM Pulse, and 15-minute market-hours polling. | Scheduled Time Ticks |
| **`services/dbService.js`** | MongoDB Single Source of Truth (SSOT) with compound indexes (`IpoMaster`, `IpoDailyGmp`, `Subscriber`, `NotificationState`). Provides sub-millisecond queries via `.lean()` and `bulkWrite()`. | Mongoose / MongoDB |
| **`templates/eventMessages.js`** | WhatsApp formatting engine. Generates mobile-optimized **Card-Tile** bulletins with monospace number badges, emojis, and subtle disclaimers. | String Interpolation |
| **`dashboard/server.js`** | High-speed static & API server hosting the desktop and mobile dashboard on Port 5050 querying MongoDB directly. | Node.js `http` |
| **`public/app.js` & `style.css`** | Super-responsive frontend featuring the **7-Column Streamlined Matrix**, real-time filtering tabs, and 1-click WhatsApp letter exports. | Vanilla JS, CSS3 Variables |

---

## 🎯 Master Lifecycle & AI Decision Matrix

The AI Decision Engine evaluates IPOs based strictly on normalized **GMP percentage gain/drop** across 5 distinct lifecycle stages:

```
    [ 🟣 UPCOMING ] ──> [ 🟢 OPEN ] ──> [ ⏳ CLOSING TODAY ] ──> [ 🔵 ALLOTTED ] ──> [ ⚪ LISTED ]
       (≤ 15 Days)       (Day 1 & 2)           (Day 3)             (BoA Date)         (≤ 7 Days)
```

### 1. 🟣 Upcoming Stage (Opening within $\le 15$ Days)
* $\ge 50\%$ GMP $\rightarrow$ **`🚀 BLOCKBUSTER PIPELINE`**
* $35\% - 50\%$ GMP $\rightarrow$ **`🔥 HIGH DEMAND PIPELINE`**
* $20\% - 35\%$ GMP $\rightarrow$ **`🟢 PROMISING PIPELINE`**
* $10\% - 20\%$ GMP $\rightarrow$ **`👀 MONITOR CLOSELY`**
* $< 10\%$ / 0% GMP $\rightarrow$ **`⏳ WAIT & WATCH (NASCENT)`** *(Never marked as Avoid)*

### 2. 🟢 Open for Bidding (Day 1 & Day 2)
* $\ge 50\%$ GMP $\rightarrow$ **`🔥 STRONG APPLY (BLOCKBUSTER)`**
* $35\% - 50\%$ GMP $\rightarrow$ **`🔥 STRONG APPLY`**
* $20\% - 35\%$ GMP $\rightarrow$ **`🟢 APPLY FOR GAIN`**
* $10\% - 20\%$ GMP $\rightarrow$ **`⏳ WAIT FOR DAY 3 (QIB)`**
* $< 10\%$ GMP $\rightarrow$ **`⚠️ CAUTION (THIN BUFFER)`** / **`🛑 WEAK INTEREST`**

### 3. ⏳ Closing Today (Final 2-Hour Action Window)
* $\ge 50\%$ GMP $\rightarrow$ **`🔥 STRONG APPLY (BLOCKBUSTER)`** *(Apply across all family demats)*
* $35\% - 50\%$ GMP $\rightarrow$ **`🔥 STRONG APPLY`**
* $20\% - 35\%$ GMP $\rightarrow$ **`🟢 APPLY FOR LISTING GAIN`** *(Check QIB $> 5\text{x}$)*
* $10\% - 20\%$ GMP $\rightarrow$ **`⚠️ APPLY WITH CAUTION (QIB>10x)`**
* $3\% - 10\%$ GMP $\rightarrow$ **`🛑 AVOID (THIN BUFFER)`**
* $< 3\%$ / 0% GMP $\rightarrow$ **`❌ AVOID (DISCOUNT RISK)`** *(Protect capital & skip)*

### 4. 🔵 Allotted Stage (Basis of Allotment Out)
* $\ge 35\%$ GMP $\rightarrow$ **`🔵 ALLOTTED (BUMPER EXPECTED)`**
* $10\% - 35\%$ GMP $\rightarrow$ **`🔵 ALLOTTED (HEALTHY GAIN)`**
* $< 10\%$ GMP $\rightarrow$ **`🔵 ALLOTTED (MODEST / FLAT)`**

### 5. ⚪ Listed Stage (Bell Ringing & $\le 7$ Days Post-Listing)
* Listing Gain $\ge 20\%$ $\rightarrow$ **`🎉 BUMPER LISTING`**
* Listing Gain $0\% - 20\%$ $\rightarrow$ **`🟢 LISTED WITH MILD GAIN`**
* Discount Listing $\rightarrow$ **`🛡️ CAPITAL PROTECTED (Avoid Call)`**

---

## 📱 WhatsApp Community Intelligence Hub

The agent broadcasts **8 distinct, ultra-compact Card-Tile formats** directly into your WhatsApp Community Announcement Group:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SAMPLE WHATSAPP INTELLIGENCE BULLETINS               │
├────────────────────────────────────┬───────────────────────────────────┤
│ 🌅 08:30 AM MORNING KICKOFF        │ 🚨 02:00 PM FINAL ACTION ALERT    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━         │ ━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│ 🌅 *RUN4DREAM IPO KICKOFF* 🚀      │ 🚨 *LAST 2 HOURS — ACTION ALERT*  │
│ 📅 20 Aug 2026                     │ 🏢 *Lalithaa Jewellery* (M)       │
│                                    │ ⏰ *Bidding Closes at 5:00 PM*    │
│ ⏳ *CLOSING TODAY:*                │ ────────────────────────          │
│ 🏢 *Lalithaa Jewellery* (M)        │ 💎 *GMP:* 🟢 ⬆️ *+22.1%* (`₹44.5`)│
│ • GMP: 🟢 ⬆️ *+22.1%* (`₹44.5`) 🚀 │ 💰 *Est. Gain:* *`+₹3,293 / lot`* │
│ • Sub: `14.8x` ➔ 🟢 *[ APPLY ]*    │ 📈 *Total Sub:* `14.8x`           │
│                                    │ 🎯 *ACTION:* 🟢 *[ STRONG APPLY ]*│
│ 🏢 *Horizon Industrial* (M)        │ ────────────────────────          │
│ • GMP: 🔴 ⬇️ *+0.8%* (`₹4.0`)      │ 📲 *Join Community:* [Link]       │
│ • Sub: `0.42x` ➔ 🛑 *[ AVOID ]*    │ _⚠️ Disclaimer: Educational only._│
└────────────────────────────────────┴───────────────────────────────────┘
```

### ⏰ The 24/7 Automated Dispatch Schedule:

1. 🌅 **08:30 AM — Morning Market Kickoff:** Summary of all Open & Closing Today IPOs with live GMP and profit targets.
2. 🔔 **10:00 AM — Listing Day Bell:** Reports listing price, percentage jump, and realized profit/lot.
3. ⏳ **02:00 PM — Final 2-Hour Action Alert:** Urgent apply/avoid advisory before 5:00 PM market cut-off.
4. 📈 **Market Hours (09:15–15:30) — Real-Time Surge Radar:** Instant alert on $\ge 5\%$ GMP breakout shifts and 30x/50x/100x subscription surges.
5. 🌙 **07:00 PM — Evening Scorecard:** Bidding closed tally and post-close grey market movements.
6. 🔭 **09:00 PM — Upcoming Pipeline Pulse:** Dispatches alerts ONLY at **T-3 (3 days before)** and **T-1 (1 day before)** bidding opens (e.g., for Aug 20 bidding, alerts are sent on Aug 17 & Aug 19 only).
7. 🎫 **Allotment Day — Direct Verification Alert:** Direct registrar portal link + BSE Universal PAN check.

---

## 🎫 Official Registrar & Allotment Resolution

Every IPO is automatically resolved to its designated SEBI Registrar via `services/allotmentService.js`:

* **Link Intime India** $\rightarrow$ `https://linkintime.co.in/initial_offer/`
* **KFin Technologies** $\rightarrow$ `https://kosmic.kfintech.com/ipostatus/`
* **Bigshare Services** $\rightarrow$ `https://www.bigshareonline.com/ipo_Allotment.html`
* **Maashitla Securities** $\rightarrow$ `https://maashitla.com/allotment-status/`
* **Skyline Financial** $\rightarrow$ `https://www.skylinerta.com/ipo.php`
* **Purva Sharegistry** $\rightarrow$ `https://www.purvashare.com/queries/`
* **Cameo Corporate** $\rightarrow$ `https://ipo.cameoindia.com/`
* **BSE Universal Backup (Any IPO)** $\rightarrow$ `https://www.bseindia.com/investors/appli_check.aspx`

---

## 🌐 Web Intelligence Matrix Dashboard

The dashboard runs locally at **`http://localhost:5050`** and provides a high-density, 7-column layout with zero horizontal scrolling:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       RUN4DREAM IPO MATRIX DASHBOARD                                   │
├───────────────────┬──────────────────┬─────────────────┬──────────────┬──────────────┬─────────────────┤
│ Company & Status  │ Price & Profit   │ Live GMP & %    │ Subscription │ Bidding (O-C)│ Allotment & List│
├───────────────────┼──────────────────┼─────────────────┼──────────────┼──────────────┼─────────────────┤
│ Tempsens (M) 🟣   │ ₹300 (50 sh)     │ +63.3% (₹190)   │ -            │ 20-Aug ➔     │ BoA: 25-Aug     │
│ Upcoming • Mfg    │ +₹9,500 / lot    │ ₹65 ↓ / ₹190 ↑  │ [    ]       │ 24-Aug       │ List: 28-Aug    │
├───────────────────┼──────────────────┼─────────────────┼──────────────┼──────────────┼─────────────────┤
│ Lalithaa (M) ⏳   │ ₹201 (74 sh)     │ +22.1% (₹44.5)  │ 12.61x       │ 17-Aug ➔     │ BoA: 20-Aug     │
│ Closing • Retail  │ +₹3,293 / lot    │ ₹17 ↓ / ₹44.5 ↑ │ [████████]   │ 19-Aug       │ List: 24-Aug    │
└───────────────────┴──────────────────┴─────────────────┴──────────────┴──────────────┴─────────────────┘
```

---

## ⚡ Step-by-Step Installation & Quick Start

### 1. Clone & Install Dependencies
```bash
git clone <repository_url>
cd ipo-intelligence-agent
npm install
```

### 2. Environment Configuration
Create `.env` in `ipo-intelligence-agent/` (referencing `.env.template`):
```env
PORT=5050
MONGO_URI=mongodb://127.0.0.1:27017/run4dream_ipoagent
COMMUNITY_INVITE_LINK=https://chat.whatsapp.com/YOUR_INVITE_CODE
WHATSAPP_TARGET_GROUP_JID=YOUR_TARGET_GROUP_JID@g.us
```

### 3. Pair WhatsApp Bot (One-Time Setup Only)
```bash
npm run whatsapp:login
```
*Point your phone camera to the terminal QR code (**WhatsApp ➔ Settings ➔ Linked Devices ➔ Link a Device**).*

> 💡 **Note on Permanent Authentication:** WhatsApp login is **100% permanent**. The multi-device keys are stored securely in `data/whatsapp_session/`. You will **never** need to scan the QR code again unless you manually log out from your phone.

### 4. Running the Decoupled Services 🚀

#### Service 1: Web Dashboard & API (Independent of WhatsApp)
```bash
# Start the web dashboard (Port 5050):
npm run dashboard

# Or with auto-reload (development):
npm run dashboard:dev
```
*Open **`http://localhost:5050`** to view the live 7-column Matrix UI.*

#### Service 2: Autonomous 24/7 Scheduler & WhatsApp Broadcaster
```bash
# Start the background worker (Crons + Scraper + WhatsApp dispatches):
npm run schedule
```
*Dispatches 08:30 AM Kickoff, 02:00 PM Final Action Alert, 07:00 PM Scorecard, 09:00 PM Pipeline Pulse, and 15-min market hours surge radar.*

#### Testing & Utility Commands:
```bash
# 1. Broadcast ALL 12 distinct card message types & formats (Complete showcase):
npm run send:all

# 2. Send single live Test Intelligence Digest to your WhatsApp channel:
npm run send:test

# 3. Broadcast 4 core tables (Kickoff, Top Picks, 2-Hr Alert, Scorecard):
npm run send:samples

# 4. Manual one-time live data sync to MongoDB:
npm run sync

# 5. Pair WhatsApp QR Code (One-time setup only):
npm run whatsapp:login

# 6. Force reset WhatsApp session if re-linking:
npm run whatsapp:reset
```

---

## 📂 Project Directory Structure

```
ipo-intelligence-agent/
├── .env.template                 # Environment variable template
├── package.json                  # Dependencies & npm run scripts
├── README.md                     # Comprehensive system documentation
├── index.js                      # Master pipeline entry point (100% DB-driven)
├── config/
│   └── index.js                  # Global configuration & thresholds
├── dashboard/
│   └── server.js                 # HTTP server (Port 5050) & API endpoints (MongoDB query)
├── data/
│   └── whatsapp_session/         # WhatsApp multi-file auth credentials (gitignored)
├── public/
│   ├── index.html                # Streamlined Matrix UI layout
│   ├── style.css                 # Dark theme, glassmorphism & visual indicators
│   └── app.js                    # Dynamic client renderer, filters & letter generator
├── scripts/
│   ├── loginWhatsapp.js          # QR code pairing utility
│   ├── testBroadcast.js          # 1-Click community broadcast test
│   └── sendAllSamples.js         # Comprehensive 8-format sample broadcaster
├── services/
│   ├── fetcher.js                # API ingestion & retention filter engine
│   ├── aiAnalyzer.js             # Financial analysis & lifecycle verdict engine
│   ├── allotmentService.js       # SEBI registrar resolution & direct link generator
│   ├── dbService.js              # MongoDB Mongoose models & bulk upsert engine (SSOT)
│   ├── notificationEngine.js     # Rate-limited state tracking & milestone engine
│   ├── scheduler.js              # Cron scheduler & market-hours poller
│   └── whatsappBot.js            # Baileys WhatsApp client & broadcast socket
└── templates/
    ├── eventMessages.js          # Card-Tile event formats for WhatsApp
    └── ipoNewsletter.js          # Daily digests & deep-dive reports
```

---

## 🛡️ Compliance & Disclaimer

```
⚠️ DISCLAIMER: All intelligence, grey market premiums (GMP), and subscription analytics 
provided by Run4Dream IPO Intelligence are strictly for educational and informational 
purposes only. Grey market quotes are unofficial and indicative. Run4Dream is not a SEBI-registered 
investment advisor. Consult a certified financial advisor before placing bids.
```

---

**Developed with ❤️ by Run4Dream &bull; Powered by Google Antigravity**
