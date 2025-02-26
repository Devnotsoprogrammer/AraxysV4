const rateLimits = new Map();

module.exports = {
  checkRateLimit(userId, limit = 5, timeWindow = 60000) {
    const now = Date.now();
    const userRateLimit = rateLimits.get(userId) || {
      count: 0,
      resetTime: now + timeWindow,
    };

    if (now > userRateLimit.resetTime) {
      userRateLimit.count = 1;
      userRateLimit.resetTime = now + timeWindow;
    } else if (userRateLimit.count >= limit) {
      return false;
    } else {
      userRateLimit.count++;
    }

    rateLimits.set(userId, userRateLimit);
    return true;
  },
};
