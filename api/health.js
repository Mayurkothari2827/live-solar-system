module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    utc: new Date().toISOString().replace('.000',''),
    ready: 30,
    expected: 30
  });
};
