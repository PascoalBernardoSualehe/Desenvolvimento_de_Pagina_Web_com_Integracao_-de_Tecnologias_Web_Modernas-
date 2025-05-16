const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// Configurar CORS para o domínio do Render
const corsOptions = {
  origin: process.env.RENDER_EXTERNAL_HOSTNAME || 'https://desenvolvimento-de-pagina-web-com-dfk9.onrender.com',
  methods: ['GET', 'POST'],
  credentials: true
};

const io = socketIo(server, {
  cors: corsOptions
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', routes);

// Middleware para log de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err.stack);
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

const adminNamespace = io.of('/admin');

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);
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

// Escutar na porta dinâmica do Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});