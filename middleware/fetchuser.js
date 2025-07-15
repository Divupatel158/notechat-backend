const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "this is a notechat jwt secret";

const fetchuser = async (req, res, next) => {
    // Accept both 'auth-token' and 'Authorization' headers
    const token = req.header('auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({error: 'No token provided'});
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        // Ensure req.user.id is set for RLS compatibility
        req.user = data.user;
        next();
    } catch (error) {
        return res.status(401).json({error: 'Invalid token'});
    }
}

module.exports = fetchuser;