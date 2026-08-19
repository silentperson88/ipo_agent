/**
 * Allotment Resolution Service
 * Automatically maps each IPO to its designated SEBI Registrar & Allotment portal
 */

const KNOWN_REGISTRARS = [
  { name: 'Link Intime', url: 'https://linkintime.co.in/initial_offer/' },
  { name: 'KFin Technologies', url: 'https://kosmic.kfintech.com/ipostatus/' },
  { name: 'Bigshare Services', url: 'https://www.bigshareonline.com/ipo_Allotment.html' },
  { name: 'Maashitla Securities', url: 'https://maashitla.com/allotment-status/' },
  { name: 'Skyline Financial', url: 'https://www.skylinerta.com/ipo.php' },
  { name: 'Purva Sharegistry', url: 'https://www.purvashare.com/queries/' },
  { name: 'Cameo Corporate', url: 'https://ipo.cameoindia.com/' },
  { name: 'Beetal Financial', url: 'http://www.beetalfinancial.com/ipo.aspx' },
  { name: 'Integrated Registry', url: 'https://www.integratedindia.in/' }
];

const BSE_UNIVERSAL_URL = 'https://www.bseindia.com/investors/appli_check.aspx';

/**
 * Detects the specific registrar for an IPO
 */
async function resolveRegistrarForIpo(ipo) {
  if (ipo.registrar?.url && ipo.registrar?.name) {
    return ipo.registrar;
  }

  // 1. Check if name/detail contains known registrar
  const targetSlug = ipo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const url = `https://www.chittorgarh.com/ipo/${targetSlug}-ipo/${ipo.id || ''}/`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (res.ok) {
      const html = await res.text();
      for (const r of KNOWN_REGISTRARS) {
        if (html.includes(r.name)) {
          return {
            name: r.name,
            url: r.url,
            bseUrl: BSE_UNIVERSAL_URL
          };
        }
      }
    }
  } catch (e) {}

  // Fallback to BSE Universal Check
  return {
    name: 'Official Registrar & BSE Portal',
    url: BSE_UNIVERSAL_URL,
    bseUrl: BSE_UNIVERSAL_URL
  };
}

module.exports = {
  KNOWN_REGISTRARS,
  BSE_UNIVERSAL_URL,
  resolveRegistrarForIpo
};
