const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: 'http://localhost:3000' && 'https://desenvolvimento-de-pagina-web-com-dfk9.onrender.com', methods: ['GET', 'POST'] }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', routes); // Rotas não precisam de conexão com banco

const adminNamespace = io.of('/admin');

io.on('connection', (socket) => {
  socket.on('newUser', ({ userId, username, type, level, location }) => {
    adminNamespace.emit('systemActivity', `Novo Utilizador: ${username} (${type}, ${level}, ${location}) cadastrado.`);
  });

  socket.on('userLogin', ({ userId, username }) => {
    adminNamespace.emit('systemActivity', `Login: ${username} entrou no sistema.`);
    adminNamespace.emit('userStatus', { userId, username, online: true });
  });

  socket.on('selectTopic', ({ userId, username, topic }) => {
    adminNamespace.emit('systemActivity', `Seleção de Tópico: ${username} escolheu o tópico '${topic}'.`);
  });

  socket.on('materialAccess', ({ userId, username, materialId, materialTitle }) => {
    adminNamespace.emit('systemActivity', `Material Acessado: ${username} acessou '${materialTitle}'.`);
  });

  socket.on('userMessage', ({ doubtId, userId, username, topic, message }) => {
    adminNamespace.emit('userMessage', { doubtId, userId, username, topic, message });
    adminNamespace.emit('systemActivity', `Mensagem: ${username}: ${message} (Dúvida ${doubtId})`);
  });

  socket.on('notifyAdmin', ({ doubtId, userId, username }) => {
    adminNamespace.emit('systemActivity', `Notificação: ${username} atingiu 5 mensagens na dúvida ${doubtId}.`);
  });

  socket.on('userLogout', ({ userId, username }) => {
    adminNamespace.emit('systemActivity', `Logout: ${username} saiu do sistema.`);
    adminNamespace.emit('userStatus', { userId, username, online: false });
  });
});

adminNamespace.on('connection', (socket) => {
  socket.on('adminMessage', ({ doubtId, message }) => {
    io.emit('adminMessage', { doubtId, message });
    adminNamespace.emit('systemActivity', `Admin respondeu na dúvida ${doubtId}: ${message}`);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

server.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});