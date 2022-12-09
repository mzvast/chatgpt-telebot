// 限制请求速率，基于id,每分钟，每个id只能请求1次
class RateLimiter {
    // Set the rate limit to 3 requests per minute
    RATE_LIMIT = 1;
    TIME_INTERVAL = 60 * 1000; // 60 seconds

    // Keep track of the number of requests for each client
    _clientsMap: Map<number, number> = new Map();
    _whiteList: Set<number>;
    constructor(private whiteList: number[]) {
        this._whiteList = new Set(whiteList);
    }

    isClientAllowed(id: number): boolean {
        if (this._whiteList.has(id)) return true;
        // Check if the client has reached the rate limit
        if (
            this._clientsMap.has(id) &&
            this._clientsMap.get(id) >= this.RATE_LIMIT
        ) {
            return false;
        }

        // Increment the client's request count
        if (!this._clientsMap.has(id)) {
            this._clientsMap.set(id, 1);
        } else {
            this._clientsMap.set(id, this._clientsMap.get(id) + 1);
        }

        // Set a timeout to clear the client's request count after the time interval
        setTimeout(() => {
            this._clientsMap.delete(id);
        }, this.TIME_INTERVAL);

        return true;
    }
}
export default RateLimiter;
