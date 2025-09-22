import { placeBet, disconnect } from '../services/game-event.js';

export const registerEvents = async (io, socket) => {
    socket.on('message', (data) => {
        const event = data.split(':')
        switch (event[0]) {
            case 'PB': return placeBet(io, socket, event.slice(1, event.length));
        }
    })
    socket.on('disconnect', () => disconnect(socket));
}
