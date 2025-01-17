import { appConfig } from "../utilities/app-config.js";
import { generateUUIDv7 } from "../utilities/common-function.js";
import { getCache, deleteCache } from "../utilities/redis-connection.js";
import { createLogger } from "../utilities/logger.js";
import { getMaxMult, logEventAndEmitResponse } from "../utilities/helper-function.js";
import { getResult } from "../module/bets/bet-session.js";
const betLogger = createLogger('Bets', 'jsonl');


export const placeBet = async(io, socket, betData) => {
    const betAmount = Number(betData[0]) || null;
    const lineRange = betData[1] ? betData[1].split(',') : null;
    if(!betAmount || !lineRange || lineRange.length == 0) return socket.emit('betError', 'Bet Amount and Multiplier Value is missing in request');
    const getMultiplierFromLineRanges = getMaxMult(lineRange.map(e=> parseInt(e)));
    if(getMultiplierFromLineRanges < 1.05) return socket.emit('betError', 'Invalid Bet');
    const cachedPlayerDetails = await getCache(`PL:${socket.id}`);
    if(!cachedPlayerDetails) return socket.emit('betError', 'Invalid Player Details');
    const playerDetails = JSON.parse(cachedPlayerDetails);
    const gameLog = { logId: generateUUIDv7(), player: playerDetails, betData: {betAmount, lineRange}};
    if(Number(playerDetails.balance) < betAmount) return logEventAndEmitResponse(gameLog, 'Insufficient Balance', 'bet', socket);
    if((betAmount < appConfig.minBetAmount) || (betAmount > appConfig.maxBetAmount)) return logEventAndEmitResponse(gameLog, 'Invalid Bet', 'bet', socket);
    const matchId = generateUUIDv7();
    const result = await getResult(matchId, betAmount, lineRange, getMultiplierFromLineRanges, playerDetails, socket, io);
    betLogger.info(JSON.stringify({ ...gameLog, result }))
    socket.emit('result', result);
};

export const disconnect = async(socket) => {
    await deleteCache(`PL:${socket.id}`);
    console.log("User disconnected:", socket.id);
};

