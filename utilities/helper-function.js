import { createLogger } from "./logger.js";
const failedBetLogger = createLogger('failedBets', 'jsonl');
import { randomInt } from 'crypto';


export const logEventAndEmitResponse = (req, res, event, socket) => {
    let logData = JSON.stringify({ req, res })
    if (event === 'bet') {
        failedBetLogger.error(logData)
    }
    return socket.emit('betError', res);
}

const probabilityTable = [
    { range: [1, 10], probability: 0.40 },
    { range: [11, 30], probability: 0.30 },
    { range: [31, 60], probability: 0.20 },
    { range: [61, 95], probability: 0.08 },
    { range: [96, 100], probability: 0.02 },
];

const cumulativeDistribution = [];
let cumulative = 0;

for (let entry of probabilityTable) {
    cumulative += entry.probability;
    cumulativeDistribution.push({ ...entry, cumulative });
}

export const emitNumber = () => {
    // const rand = Math.random();
    // for (let entry of cumulativeDistribution) {
    //     if (rand < entry.cumulative) {
    //         return randomInt(entry.range[0], entry.range[1] + 1);
    //     }
    // }
    // return 100;
    return Math.floor(Math.random() * 99) + 1;
}


const RTP = 92;

export const getMaxMult = (ranges) => {
    let mult = 1;
    for (let range of ranges) {
        const singleMult = getMaxMultFromRange(range);
        mult *= singleMult;
    };
    const finalMult = mult * (RTP / 100);
    return Math.floor(finalMult * 100) / 100;
}

function getMaxMultFromRange(num) {
    const range = 100;
    const prob = (range - num) / range;
    const mult = 1 / prob;
    return mult;
}