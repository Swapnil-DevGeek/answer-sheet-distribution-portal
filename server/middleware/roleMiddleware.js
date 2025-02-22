const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // console.log(req.user)
        console.log(req.user);
        if (!req.user || !req.user.roles) {
            return res.status(403).json({
                message: 'Not authorized to access this resource'
            });
        }

        const hasAllowedRole = req.user.roles.some(role => allowedRoles.includes(role));
        if (!hasAllowedRole) {
            return res.status(403).json({
                message: `Your roles (${req.user.roles.join(', ')}) are not allowed to access this resource`
            });
        }
        next();
    }
};

module.exports = authorizeRoles;