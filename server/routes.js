const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const dataPath = path.join(__dirname, 'data.json');

// Função para ler o JSON
async function readData() {
  try {
    console.log(`Tentando ler arquivo em: ${dataPath}`);
    await fs.access(dataPath, fs.constants.R_OK); // Verifica se o arquivo existe e é legível
    const data = await fs.readFile(dataPath, 'utf8');
    const parsedData = JSON.parse(data);
    console.log('Arquivo data.json lido com sucesso');
    return parsedData;
  } catch (err) {
    console.error(`Erro ao ler data.json: ${err.message}`, err.stack);
    throw new Error(`Erro ao ler data.json: ${err.message}`);
  }
}

// Função para escrever no JSON
async function writeData(data) {
  try {
    console.log(`Escrevendo em: ${dataPath}`);
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    console.log('Arquivo data.json escrito com sucesso');
  } catch (err) {
    console.error(`Erro ao escrever em data.json: ${err.message}`, err.stack);
    throw new Error(`Erro ao escrever em data.json: ${err.message}`);
  }
}

// Função para gerar ID único
function generateId(array) {
  return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
}

// Users
router.get('/users', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.users);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users', async (req, res) => {
  console.log('Requisição recebida em /api/users:', req.body);
  const { username, type, level, location } = req.body;
  try {
    const data = await readData();
    if (data.users.find(u => u.username === username)) {
      console.log('Usuário já existe:', username);
      return res.status(400).json({ success: false, message: 'Usuário já existe' });
    }
    const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: newId,
      username,
      type,
      level,
      location,
      online: false,
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    await writeData(data);
    console.log('Usuário cadastrado com sucesso:', username);
    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find(u => u.id === parseInt(req.params.id));
    if (user) res.json(user);
    else res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const data = await readData();
    const index = data.users.findIndex(u => u.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    data.users.splice(index, 1);
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Nome de usuário é obrigatório.' });
    const data = await readData();
    const user = data.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    user.online = true;
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users/logout', async (req, res) => {
  console.log('Requisição recebida em /api/users/logout:', req.body);
  try {
    const { username } = req.body;
    if (!username) {
      console.log('Nome de usuário não fornecido');
      return res.status(400).json({ success: false, message: 'Nome de usuário é obrigatório.' });
    }
    const data = await readData();
    const user = data.users.find(u => u.username === username);
    if (!user) {
      console.log('Usuário não encontrado:', username);
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    user.online = false;
    await writeData(data);
    console.log('Logout bem-sucedido para:', username);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao processar logout:', err.message, err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Nome de usuário é obrigatório.' });
    const data = await readData();
    const user = data.users.find(u => u.username === username);
    if (user) res.json({ success: true, user });
    else res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admins
router.get('/admins', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.admins);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admins', async (req, res) => {
  try {
    const { username, adminKey } = req.body;
    if (!username || !adminKey) {
      return res.status(400).json({ success: false, message: 'Username e admin_key são obrigatórios.' });
    }
    const data = await readData();
    const newAdmin = {
      id: generateId(data.admins),
      username,
      admin_key: adminKey
    };
    data.admins.push(newAdmin);
    await writeData(data);
    res.json({ success: true, message: 'Administrador adicionado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    const data = await readData();
    const index = data.admins.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Administrador não encontrado.' });
    data.admins.splice(index, 1);
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/auth', async (req, res) => {
  try {
    const { adminKey } = req.body;
    if (!adminKey) return res.status(400).json({ success: false, message: 'Chave de administrador é obrigatória.' });
    const data = await readData();
    const admin = data.admins.find(a => a.admin_key === adminKey);
    if (admin) res.json({ success: true, admin });
    else res.status(401).json({ success: false, message: 'Chave de administrador inválida.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Materials
router.get('/materials', async (req, res) => {
  console.log('Requisição recebida em /api/materials:', req.query);
  try {
    const data = await readData();
    let materials = Array.isArray(data.materials) ? data.materials : [];
    console.log('Materiais antes do filtro:', materials);
    if (req.query.topic) {
      materials = materials.filter(m => m.topics && Array.isArray(m.topics) && m.topics.includes(req.query.topic));
    }
    if (req.query.level) {
      materials = materials.filter(m => m.level === req.query.level);
    }
    if (req.query.format) {
      materials = materials.filter(m => m.format === req.query.format);
    }
    console.log('Materiais após o filtro:', materials);
    res.json(materials);
  } catch (err) {
    console.error('Erro ao buscar materiais:', err.message, err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/materials/:id', async (req, res) => {
  try {
    const data = await readData();
    const material = data.materials.find(m => m.id === parseInt(req.params.id));
    if (material) res.json(material);
    else res.status(404).json({ success: false, message: 'Material não encontrado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/materials', async (req, res) => {
  try {
    const { title, author, level, topics, format, url } = req.body;
    if (!title || !author || !level || !topics || !format || !url) {
      return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }
    const data = await readData();
    const newMaterial = {
      id: generateId(data.materials),
      title,
      author,
      level,
      topics,
      format,
      url,
      views: 0
    };
    data.materials.push(newMaterial);
    await writeData(data);
    res.json({ success: true, message: 'Material adicionado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/materials/:id', async (req, res) => {
  try {
    const { title, author, level, topics, format, url, views } = req.body;
    const data = await readData();
    const index = data.materials.findIndex(m => m.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Material não encontrado.' });
    data.materials[index] = { id: parseInt(req.params.id), title, author, level, topics, format, url, views };
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/materials/:id', async (req, res) => {
  try {
    const data = await readData();
    const index = data.materials.findIndex(m => m.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Material não encontrado.' });
    data.materials.splice(index, 1);
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Doubts
router.get('/doubts', async (req, res) => {
  try {
    const data = await readData();
    const doubts = data.doubts.map(doubt => ({
      ...doubt,
      chatMessages: data.chatMessages.filter(cm => cm.doubtId === doubt.id)
    }));
    res.json(doubts);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/doubts', async (req, res) => {
  try {
    const { userId, materialId, topic, userLevel, message } = req.body;
    if (!userId || !topic || !userLevel) {
      return res.status(400).json({ success: false, message: 'userId, topic e userLevel são obrigatórios.' });
    }
    const data = await readData();
    const newDoubt = {
      id: generateId(data.doubts),
      userId: parseInt(userId),
      materialId: materialId ? parseInt(materialId) : null,
      topic,
      userLevel
    };
    data.doubts.push(newDoubt);
    if (message) {
      const user = data.users.find(u => u.id === parseInt(userId));
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      const newMessage = {
        id: generateId(data.chatMessages),
        doubtId: newDoubt.id,
        sender: user.username,
        text: message,
        timestamp: new Date().toISOString()
      };
      data.chatMessages.push(newMessage);
    }
    await writeData(data);
    res.json({ success: true, doubtId: newDoubt.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/doubts', async (req, res) => {
  try {
    const { doubtId, message, sender } = req.body;
    if (!doubtId || !message || !sender) {
      return res.status(400).json({ success: false, message: 'doubtId, message e sender são obrigatórios.' });
    }
    const data = await readData();
    if (!data.doubts.find(d => d.id === parseInt(doubtId))) {
      return res.status(404).json({ success: false, message: 'Dúvida não encontrada.' });
    }
    const newMessage = {
      id: generateId(data.chatMessages),
      doubtId: parseInt(doubtId),
      sender,
      text: message,
      timestamp: new Date().toISOString()
    };
    data.chatMessages.push(newMessage);
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Accesses
router.get('/accesses', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.accesses);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/accesses', async (req, res) => {
  try {
    const { user, materialId, path } = req.body;
    if (!user || !materialId || !path) {
      return res.status(400).json({ success: false, message: 'user, materialId e path são obrigatórios.' });
    }
    const data = await readData();
    const userData = data.users.find(u => u.username === user);
    if (!userData) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    const newAccess = {
      id: generateId(data.accesses),
      userId: userData.id,
      materialId: parseInt(materialId),
      path,
      date: new Date().toISOString()
    };
    data.accesses.push(newAccess);
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reports
router.get('/reports/doubts', async (req, res) => {
  try {
    const data = await readData();
    const doubtCounts = data.doubts.reduce((acc, doubt) => {
      acc[doubt.topic] = (acc[doubt.topic] || 0) + 1;
      return acc;
    }, {});
    res.json({
      topics: Object.keys(doubtCounts),
      counts: Object.values(doubtCounts)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/usage', async (req, res) => {
  try {
    const data = await readData();
    const accessesByDate = data.accesses.reduce((acc, access) => {
      const date = access.date.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    const accessesPerDay = Object.keys(accessesByDate).length > 0
      ? Math.round(data.accesses.length / Object.keys(accessesByDate).length)
      : 0;
    const avgSessionTime = data.accesses.length > 0 ? 10 : 0;
    const topMaterials = data.materials
      .sort((a, b) => b.views - a.views)
      .slice(0, 3)
      .map(m => m.title);
    res.json({
      accessesPerDay,
      avgSessionTime,
      topMaterials
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;