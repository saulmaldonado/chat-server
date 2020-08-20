import koa from 'koa';
import { createServer } from 'http';
import socketio, { Socket } from 'socket.io';
import koaStatic from 'koa-static';
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

const filterMessage = async (message: string, socket: Socket) => {
  if (!badWords.includes(message)) {
    return socket.emit(events.SEND_MESSAGE, message);
  }

  return socket.emit('BAD_WORD', "you can't say that");
};

// io
io.on('connection', async (socket: Socket) => {
  console.log('a new user connected');
  socket.on(events.SEND_MESSAGE, async (message: string) => {
    await rateLimit(socket);
    await filterMessage(message, socket);
  });
});

const port = process.env.PORT ?? 5000;

server.listen(port, () => {
  console.log(`listening on port ${port}...`);
});
