import { appConfig } from "../../utilities/app-config.js";
import { updateBalanceFromAccount } from "../../utilities/common-function.js";
import { generateSkewedRandom, getMaxMult, getRandomMultiplier } from "../../utilities/helper-function.js";
import { getCache, setCache } from "../../utilities/redis-connection.js";
import { insertSettlement } from "./bet-db.js";

export const getResult = async (matchId, betAmount, lineRanges, getMultiplierFromLineRanges, playerDetails, socket, io) => {
    const userIP = socket.handshake.headers?.['x-forwarded-for']?.split(',')[0].trim() || socket.handshake.address;
    const playerId = playerDetails.id.split(':')[1];

    const updateBalanceData = {
        id: matchId,
        bet_amount: betAmount,
        socket_id: playerDetails.socketId,
        user_id: playerId,
        ip: userIP
    };

    const transaction = await updateBalanceFromAccount(updateBalanceData, "DEBIT", playerDetails);
    if (!transaction) return { error: 'Bet Cancelled by Upstream' };
    playerDetails.balance = (playerDetails.balance - betAmount).toFixed(2);
    await setCache(`PL:${playerDetails.socketId}`, JSON.stringify(playerDetails));
    socket.emit('info', { user_id: playerDetails.userId, operator_id: playerDetails.operatorId, balance: playerDetails.balance });
    const bet_id = `BT:${matchId}:${playerDetails.operatorId}:${playerDetails.userId}:${betAmount}:${lineRanges}`;
    let isWin = true;
    const result = [];
    for(const multiplier of lineRanges){
        const RandomMultiplier = generateSkewedRandom();
        result.push(RandomMultiplier);
        if(Number(multiplier) >= RandomMultiplier) isWin = false;
    }
    let winAmount = 0;
    if (isWin) {
        winAmount = Math.min((Number(betAmount) * getMultiplierFromLineRanges), Number(appConfig.maxCashoutAmount)).toFixed(2);
        setTimeout(async () => {
            const updateBalanceData = {
                id: matchId,
                winning_amount: winAmount,
                socket_id: playerDetails.socketId,
                txn_id: transaction.txn_id,
                user_id: playerDetails.id.split(':')[1],
                ip: userIP
            };
            const isTransactionSuccessful = await updateBalanceFromAccount(updateBalanceData, "CREDIT", playerDetails);
            if (!isTransactionSuccessful) console.error(`Credit failed for user: ${playerDetails.userId} for round ${matchId}`);
            const creditPlayerDetails = await getCache(`PL:${playerDetails.socketId}`);
            if (creditPlayerDetails) {
                let parseduserDetails = JSON.parse(creditPlayerDetails);
                parseduserDetails.balance = (Number(parseduserDetails.balance) + Number(winAmount)).toFixed(2);
                await setCache(`PL:${parseduserDetails.socketId}`, JSON.stringify(parseduserDetails));
                socket.emit('info', { user_id: parseduserDetails.userId, operator_id: parseduserDetails.operatorId, balance: parseduserDetails.balance });
            }
        }, 500);
    };
    //Insert Into Settlement
    await insertSettlement(bet_id, getMultiplierFromLineRanges, isWin);
    return { winningRange: result, winAmount, settedMult: getMultiplierFromLineRanges };
}