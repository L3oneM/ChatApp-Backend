const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const Filter = require('bad-words');

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
} = require('./utils/user');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());

io.on('connection', socket => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) {
      return callback(error);
    }

    socket.emit('message', {
      user: 'Admin',
      text: `Welcome ${user.name}`,
      createdAt: new Date().getTime()
    });
    socket.broadcast.to(user.room).emit('message', {
      user: 'Admin',
      text: `${user.name} has joined the conversation`,
      createdAt: new Date().getTime()
    });

    socket.join(user.room);

    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return cb('Profanity is not allowed!');
    }

    io.to(user.room).emit('message', {
      user: user.name,
      text: message,
      createdAt: new Date().getTime()
    });
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    callback();
  });

  socket.on('sendLocation', (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('message', {
      user: user.name,
      text: `https://google.com/maps?q=${coords.latitude},${coords.longitude}`,
      createdAt: new Date().getTime()
    });
    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', {
        user: 'admin',
        text: `${user.name} has left the room`,
        createdAt: new Date().getTime()
      });
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is listeng on port ${PORT}`);
});
