const jwt = require('jsonwebtoken');
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided, authorization denied.' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id,
            roles: decoded.roles, // Ensure roles are included
            activeRole: decoded.activeRole
        };
        console.log(req.user);
        console.log('req.user');
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = authMiddleware;