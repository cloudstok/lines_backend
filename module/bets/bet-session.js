import { appConfig } from "../../utilities/app-config.js";
import { updateBalanceFromAccount } from "../../utilities/common-function.js";
import { getRandomMultiplier } from "../../utilities/helper-function.js";
import { getCache, setCache } from "../../utilities/redis-connection.js";
import { insertSettlement } from "./bet-db.js";

export const getResult = async (matchId, betAmount, selectedMultiplier, playerDetails, socket, io) => {
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
    const bet_id = `BT:${matchId}:${playerDetails.operatorId}:${playerDetails.userId}:${betAmount}:${selectedMultiplier}`;
    const RandomMultiplier = Number(getRandomMultiplier());
    const isWin = RandomMultiplier >= selectedMultiplier;
    if (isWin) {
        const winAmount = Math.min((Number(betAmount) * selectedMultiplier), Number(appConfig.maxCashoutAmount)).toFixed(2);
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
            if(winAmount > betAmount) socket.emit('cashout', { winAmount});
            const creditPlayerDetails = await getCache(`PL:${playerDetails.socketId}`);
            if (creditPlayerDetails) {
                let parseduserDetails = JSON.parse(creditPlayerDetails);
                parseduserDetails.balance = (Number(parseduserDetails.balance) + Number(winAmount)).toFixed(2);
                await setCache(`PL:${parseduserDetails.socketId}`, JSON.stringify(parseduserDetails));
                socket.emit('info', { user_id: parseduserDetails.userId, operator_id: parseduserDetails.operatorId, balance: parseduserDetails.balance });
            }
        }, 500);
    };
    io.emit('bets', {
        userId: `${playerDetails.userId.slice(0, 2)}**${playerDetails.userId.slice(-2)}`,
        time : new Date(),
        betAmount, 
        multiplier: isWin ? selectedMultiplier : 0.00,
        payout: isWin ? Math.min((Number(betAmount) * selectedMultiplier), Number(appConfig.maxCashoutAmount)).toFixed(2) : 0.00
    });
    //Insert Into Settlement
    await insertSettlement(bet_id, RandomMultiplier);
    return { winningMultiplier: RandomMultiplier };
}