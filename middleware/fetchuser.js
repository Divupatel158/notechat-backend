const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://mwretrwmbfbqwmseyyhk.supabase.co/auth/v1/keys'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    var signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const fetchuser = (req, res, next) => {
  const token =
    req.header('Authorization')?.replace('Bearer ', '') ||
    req.header('auth-token');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, getKey, {}, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = { id: decoded.sub }; // sub is the Supabase user UUID
    next();
  });
};

module.exports = fetchuser;