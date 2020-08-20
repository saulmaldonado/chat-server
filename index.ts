import koa from 'koa';
import { createServer } from 'http';
import socketio, { Socket } from 'socket.io';
import koaStatic from 'koa-static';

import events from './socketIoEvents';

const app = new koa();

const server = createServer(app.callback());
const io = socketio(server);

app.use(koaStatic(__dirname));

io.on('connection', (socket: Socket) => {
  console.log('a new user connected');
  socket.on(events.SEND_MESSAGE, (message: string) => {
    socket.broadcast.emit(message);
  });
});

const port = process.env.PORT ?? 5000;

server.listen(port, () => {
  console.log(`listening on port ${port}...`);
});
