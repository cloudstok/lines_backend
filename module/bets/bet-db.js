import { write } from "../../utilities/db-connection.js";


export const insertSettlement = async(data, matchMult, isWin, result)=> {
    try{
        const [initial, matchId, operatorId, userId, betAmount, lineRanges] = data.split(':');
        const decodeUserId = decodeURIComponent(userId);
        const status = isWin ? 'WIN' : 'LOSS';
        await write(`INSERT INTO settlement(bet_id, match_id, user_id, operator_id, bet_amount, max_mult, line_ranges, result, status) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data, matchId, decodeUserId, operatorId, parseFloat(betAmount), matchMult, lineRanges, JSON.stringify(result), status]);
        console.log(`Settlement data inserted successfully`);
    }catch(err){
        console.error(`Err while inserting data in table is:::`, err);
    }
}