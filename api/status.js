module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    busy: false,
    ready: 29,
    total: 30,
    message: 'Ready',
    errors: {},
    lastRefreshUTC: new Date().toISOString().replace('.000','')
  });
};
