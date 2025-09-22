import { getUserDataFromSource } from './module/players/player-data.js'
import { registerEvents } from './router/event-route.js';
import { setCache, getCache } from "./utilities/redis-connection.js";

export const initSocket = (io) => {
    const onConnection = async (socket) => {
        console.log("socket connected");
        const token = socket.handshake.query.token;
        const game_id = socket.handshake.query.game_id;
        if (!token) {
            socket.disconnect(true);
            return console.log("No Token Provided", token);
        }
        const userData = await getUserDataFromSource(token, game_id);
        if (!userData) {
            console.log("Invalid token", token);
            return socket.disconnect(true);
        };

        const userKey = `USER:${userData.operatorId}:${userData.userId}`;
        const isUserExist = await getCache(userKey);
        if (isUserExist) {
            console.log("User already connected from a platform, disconnecting older resource....");
            const socket = io.sockets.sockets.get(isUserExist);
            if (socket) {
                socket.emit('betError', 'User connected from another source');
                socket.disconnect(true);
            }
        }

        socket.emit('info', { user_id: userData.userId, operator_id: userData.operatorId, balance: Number(userData.balance).toFixed(2) });
        await setCache(`PL:${socket.id}`, JSON.stringify({ ...userData, socketId: socket.id }), 3600);
        await setCache(userKey, socket.id)
        registerEvents(io, socket);
        socket.on('error', (error) => {
            console.error(`Socket error: ${socket.id}. Error: ${error.message}`);
        });
    }
    io.on("connection", onConnection);
}

