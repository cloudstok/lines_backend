import { createLogger } from "./logger.js";
const failedBetLogger = createLogger('failedBets', 'jsonl');

export const logEventAndEmitResponse = (req, res, event, socket) => {
  let logData = JSON.stringify({ req, res })
  if (event === 'bet') {
    failedBetLogger.error(logData)
  }
  return socket.emit('betError', res);
}

export const generateSkewedRandom = () => {
    const skew = Math.random(); // Generates a uniform random number between 0 and 1
    const biased = Math.pow(skew, 2); // Squaring skews the distribution towards 0
    return Math.floor(biased * 101); // Scale to 0-100 and round down
}

export const getRandomMultiplier = () => {
    const win_per = (Math.random() * 99.00);
    let mult = (RTP) / (win_per * 100);
    if(mult > 1000) mult = 1000;
    return Number(mult).toFixed(2)
}

const RTP = 92;

export const getMaxMult = (ranges) => {
    let mult = 1;
    for(let range of ranges){
        const singleMult = getMaxMultFromRange(range);
        mult *= singleMult;
    };
    const finalMult = mult * (RTP/100) ;
    return Math.floor(finalMult * 100) / 100;
}

function getMaxMultFromRange(num){
    const range = 100;
    const prob = (range - num) / range;
    const mult = 1/prob;
    return mult;
}