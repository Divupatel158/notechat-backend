const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "this is a notechat jwt secret";

const fetchuser = async (req, res, next) => {
    //get the user form the jwt token and attach it to the request
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).json({error: 'No token provided'});
    }
    //verify the token
    try {
    const data=jwt.verify(token, JWT_SECRET);
    req.user=data.user;
    next();
    } catch (error) {
        return res.status(401).json({error: 'Invalid token'});
    }
}

module.exports=fetchuser;