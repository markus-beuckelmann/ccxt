'use strict';

const { ROUND_UP, ROUND_DOWN } = require ('./number')

//-------------------------------------------------------------------------
// converts timeframe to seconds
const parseTimeframe = (timeframe) => {

    const amount = timeframe.slice (0, -1)
    const unit = timeframe.slice (-1)
    let scale = 60 // 1m by default

    if (unit === 'y') {
        scale = 60 * 60 * 24 * 365
    } else if (unit === 'M') {
        scale = 60 * 60 * 24 * 30
    } else if (unit === 'w') {
        scale = 60 * 60 * 24 * 7
    } else if (unit === 'd') {
        scale = 60 * 60 * 24
    } else if (unit === 'h') {
        scale = 60 * 60
    }

    return amount * scale
}

const roundTimeframe = (timeframe, timestamp, direction = ROUND_DOWN) => {
    const ms = parseTimeframe (timeframe) * 1000
    // Get offset based on timeframe in milliseconds
    const offset = timestamp % ms
    return timestamp - offset + ((direction === ROUND_UP) ? ms : 0);
}

// given a sorted arrays of trades (recent last) and a timeframe builds an array of OHLCV candles
const buildOHLCVC = (trades, timeframe = '1m', since = -Infinity, limit = Infinity) => {
    const ms = parseTimeframe (timeframe) * 1000;
    const ohlcvs = [];
    const [ timestamp, /* open */, high, low, close, volume, count ] = [ 0, 1, 2, 3, 4, 5, 6 ];
    const oldest = Math.min (trades.length - 1, limit);

    for (let i = 0; i <= oldest; i++) {
        const trade = trades[i];
        if (trade.timestamp < since)
            continue;
        const openingTime = Math.floor (trade.timestamp / ms) * ms; // shift to the edge of m/h/d (but not M)
        const candle = ohlcvs.length - 1;

        if (candle === -1 || openingTime >= ohlcvs[candle][timestamp] + ms) {
            // moved to a new timeframe -> create a new candle from opening trade
            ohlcvs.push ([
                openingTime,  // timestamp
                trade.price,  // O
                trade.price,  // H
                trade.price,  // L
                trade.price,  // C
                trade.amount, // V
                1,            // count
            ]);
        } else {
            // still processing the same timeframe -> update opening trade
            ohlcvs[candle][high] = Math.max (ohlcvs[candle][high], trade.price);
            ohlcvs[candle][low] = Math.min (ohlcvs[candle][low], trade.price);
            ohlcvs[candle][close] = trade.price;
            ohlcvs[candle][volume] += trade.amount;
            ohlcvs[candle][count]++;
        } // if
    } // for
    return ohlcvs;
}

/*  ------------------------------------------------------------------------ */

module.exports = {

    aggregate (bidasks) {

        const result = {}

        for (let i = 0; i < bidasks.length; i++) {
            const [ price, volume ] = bidasks[i];
            if (volume > 0) {
                result[price] = (result[price] || 0) + volume
            }
        }

        return Object.keys (result).map (price => [parseFloat (price), parseFloat (result[price])])
    },

    parseTimeframe,
    roundTimeframe,
    buildOHLCVC,
    ROUND_UP,
    ROUND_DOWN
}

/*  ------------------------------------------------------------------------ */
