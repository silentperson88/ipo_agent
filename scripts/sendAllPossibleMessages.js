const botService = require('../services/whatsappBot');
const config = require('../config');
const {
  formatMorningKickoff,
  formatFinalActionAlert,
  formatEveningScorecard,
  formatUpcomingAnnouncement,
  formatGmpShiftAlert,
  formatSubscriptionMilestone,
  formatListingBell,
  formatAllotmentAlert
} = require('../templates/eventMessages');
const { formatDailyDigest, formatSingleIpoLetter } = require('../templates/ipoNewsletter');

// High-fidelity realistic sample dataset covering all lifecycle states
const mockIpos = {
  strongApplyClosing: {
    name: 'Lalithaa Jewellery Mart',
    category: 'Mainboard',
    status: 'Closing Today',
    priceBand: { price: 201, lotSize: 74, minInvestment: 14874 },
    gmp: { amount: 44.5, percent: 22.1, estListing: 245.5 },
    subscription: { raw: '14.8x', total: 14.8, qib: '28.4x', retail: '12.6x', snii: '18.2x' },
    dates: { open: '17-Aug', close: '19-Aug', allotment: '20-Aug', listing: '24-Aug' },
    analysis: { verdict: '?? APPLY AT CUT-OFF', expectedProfitPerLot: 3293, stars: '????', strategy: 'Apply across family demat accounts.' }
  },
  avoidClosing: {
    name: 'Horizon Industrial Tech',
    category: 'Mainboard',
    status: 'Closing Today',
    priceBand: { price: 480, lotSize: 31, minInvestment: 14880 },
    gmp: { amount: 4, percent: 0.8, estListing: 484 },
    subscription: { raw: '0.42x', total: 0.42, qib: '0.15x', retail: '0.65x', snii: '0.30x' },
    dates: { open: '17-Aug', close: '19-Aug', allotment: '20-Aug', listing: '24-Aug' },
    analysis: { verdict: '? AVOID (DISCOUNT RISK)', expectedProfitPerLot: 124, stars: '?', strategy: 'Capital protection priority. Skip.' }
  },
  blockbusterOpen: {
    name: 'Tempsens Instruments (India)',
    category: 'Mainboard',
    status: 'Open',
    priceBand: { price: 300, lotSize: 50, minInvestment: 15000 },
    gmp: { amount: 190, percent: 63.3, estListing: 490 },
    subscription: { raw: '4.2x', total: 4.2, qib: '6.5x', retail: '3.8x', snii: '5.1x' },
    dates: { open: '20-Aug', close: '24-Aug', allotment: '25-Aug', listing: '28-Aug' },
    analysis: { verdict: '?? STRONG APPLY (BLOCKBUSTER)', expectedProfitPerLot: 9500, stars: '?????', strategy: 'Maximum bid allocation.' }
  },
  upcomingList: [
    {
      name: 'Shiprocket Delivery Ltd',
      category: 'Mainboard',
      status: 'Upcoming',
      countdownBadge: '?? *OPENS TOMORROW (Final Checklist)*',
      daysUntilOpen: 1,
      priceBand: { price: 98, lotSize: 150, minInvestment: 14700 },
      gmp: { amount: 35, percent: 35.7, estListing: 133 },
      dates: { open: '21-Aug', close: '25-Aug', allotment: '26-Aug', listing: '29-Aug' }
    },
    {
      name: 'Behari Lal Engineering',
      category: 'Mainboard',
      status: 'Upcoming',
      countdownBadge: '? *OPENS IN 3 DAYS (Prepare Funds)*',
      daysUntilOpen: 3,
      priceBand: { price: 285, lotSize: 52, minInvestment: 14820 },
      gmp: { amount: 133, percent: 46.7, estListing: 418 },
      dates: { open: '23-Aug', close: '27-Aug', allotment: '28-Aug', listing: '01-Sep' }
    }
  ]
};

async function broadcastAllMessageTypes() {
  console.log('======================================================');
  console.log('?? RUN4DREAM — BROADCAST ALL TEST MESSAGE TYPES');
  console.log('======================================================\n');

  await botService.initialize();

  console.log('? Connecting to WhatsApp...');
  let attempts = 0;
  while (!botService.isConnected && attempts < 15) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  if (!botService.isConnected) {
    console.error('? Bot not connected yet. Run "npm run whatsapp:login" first.');
    process.exit(1);
  }

  if (!botService.availableGroups || botService.availableGroups.length === 0) {
    await botService.loadCommunityGroups();
  }

  const targetJid = process.env.WHATSAPP_TARGET_GROUP_JID || config.whatsapp?.targetGroupJid || botService.targetGroupJid || (botService.availableGroups.length > 0 ? botService.availableGroups[0].id : null);

  if (!targetJid) {
    console.error('? No target group found.');
    process.exit(1);
  }

  console.log(`\n?? Delivering test messages to: ${targetJid}\n`);

  const testScenarios = [
    {
      id: 1,
      title: '?? 08:30 AM Morning Market Kickoff',
      message: formatMorningKickoff(
        [mockIpos.blockbusterOpen],
        [mockIpos.strongApplyClosing, mockIpos.avoidClosing]
      )
    },
    {
      id: 2,
      title: '?? 02:00 PM Final Action Alert (STRONG APPLY)',
      message: formatFinalActionAlert(mockIpos.strongApplyClosing)
    },
    {
      id: 3,
      title: '?? 02:00 PM Final Action Alert (AVOID / DISCOUNT RISK)',
      message: formatFinalActionAlert(mockIpos.avoidClosing)
    },
    {
      id: 4,
      title: '?? Real-Time 5% GMP Breakout Surge Alert',
      message: formatGmpShiftAlert(mockIpos.strongApplyClosing, 16.5, 22.1)
    },
    {
      id: 5,
      title: '?? 100x Blockbuster Subscription Milestone Alert',
      message: formatSubscriptionMilestone(
        { ...mockIpos.strongApplyClosing, subscription: { raw: '104.2x' } },
        100
      )
    },
    {
      id: 6,
      title: '?? 07:00 PM Evening Scorecard & Post-Close Headlines',
      message: formatEveningScorecard(
        [mockIpos.strongApplyClosing, mockIpos.avoidClosing],
        [
          { name: 'Shiprocket Delivery Ltd', category: 'Mainboard', gmp: { amount: 38, percent: 38.8 }, dates: { listing: '01-Sep' } },
          { name: 'Behari Lal Engineering', category: 'Mainboard', gmp: { amount: 145, percent: 50.8 }, dates: { listing: '02-Sep' } }
        ]
      )
    },
    {
      id: 7,
      title: '?? 09:00 PM Upcoming Pipeline Radar (T-3 and T-1 Countdown Only)',
      message: formatUpcomingAnnouncement(mockIpos.upcomingList)
    },
    {
      id: 8,
      title: '?? 10:00 AM Listing Day Bell (BUMPER PROFIT)',
      message: formatListingBell(mockIpos.strongApplyClosing, 265, 201)
    },
    {
      id: 9,
      title: '??? 10:00 AM Listing Day Bell (CAPITAL PROTECTED)',
      message: formatListingBell(mockIpos.avoidClosing, 455, 480)
    },
    {
      id: 10,
      title: '?? Allotment Status Out Alert',
      message: formatAllotmentAlert(mockIpos.strongApplyClosing, {
        name: 'Link Intime India',
        url: 'https://linkintime.co.in/initial_offer/',
        bseUrl: 'https://www.bseindia.com/investors/appli_check.aspx'
      })
    },
    {
      id: 11,
      title: '?? Single IPO Deep-Dive Letter',
      message: formatSingleIpoLetter(mockIpos.strongApplyClosing)
    },
    {
      id: 12,
      title: '?? Daily IPO Intelligence Digest',
      message: formatDailyDigest([
        mockIpos.strongApplyClosing,
        mockIpos.avoidClosing,
        mockIpos.blockbusterOpen,
        ...mockIpos.upcomingList
      ])
    }
  ];

  console.log(`Sending ${testScenarios.length} formatted message types with 2.5s pacing...\n`);

  for (let i = 0; i < testScenarios.length; i++) {
    const item = testScenarios[i];
    console.log(`[${i + 1}/${testScenarios.length}] ?? Dispatching: ${item.title}`);
    
    try {
      await botService.sock.sendMessage(targetJid, { text: item.message });
      console.log(`   ? Delivered successfully!`);
    } catch (err) {
      console.error(`   ? Error:`, err.message);
    }

    if (i < testScenarios.length - 1) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  console.log('\n======================================================');
  console.log('? ALL 12 TEST MESSAGE FORMATS DELIVERED TO WHATSAPP!');
  console.log('?? Check your WhatsApp channel now to view all card formats.');
  console.log('======================================================\n');

  setTimeout(() => process.exit(0), 1000);
}

broadcastAllMessageTypes();
