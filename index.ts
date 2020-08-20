import koa from 'koa';
import { createServer, Server } from 'http';
import socketio, { Socket } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from 'dotenv';

import events from './socketIoEvents';
import badWords from './badwords.json';

config();

const app = new koa();

const server = createServer(app.callback());
const io = socketio(server);

// rate limiter
const rateLimiter = new RateLimiterMemory({
  points: Number(process.env.POINTS_PER_SECOND!),
  duration: 1,
});

// app.use(koaStatic(__dirname));

// helper methods
const rateLimit = async (socket: Socket) => {
  try {
    await rateLimiter.consume(socket.handshake.address);
  } catch (rejRes) {
    socket.emit('blocked', { retry: rejRes.msBeforeNext });
  }
};

const filterMessage = async (
  message: string,
  socket: Socket,
  io: socketio.Server,
  price?: number
) => {
  if (!badWords.includes(message.trim().toLowerCase())) {
    return io.emit(events.SEND_MESSAGE, {
      message,
      id: socket.id,
      price,
    });
  }

  return socket.emit('BAD_WORD', "you can't say that");
};

// io
io.on('connection', async (socket: Socket) => {
  console.log('a new user connected');
  socket.on(
    events.SEND_MESSAGE,
    async (message: string | ArrayBuffer, price?: number) => {
      await rateLimit(socket);
      if (typeof message === 'string') {
        await filterMessage(message, socket, io, price);
      } else {
        io.emit(events.SEND_MESSAGE, { message, id: socket.id });
      }
    }
  );
});

const port = process.env.PORT ?? 5000;

server.listen(port, () => {
  console.log(`listening on port ${port}...`);
});
