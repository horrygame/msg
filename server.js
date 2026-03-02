const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Главная страница (файл index.html должен лежать в той же папке)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Хранилище данных
let users = [];            // список никнеймов
let messages = [];         // все сообщения

// Время жизни сообщения – 12 часов
const MESSAGE_LIFETIME = 12 * 60 * 60 * 1000; // 12 часов в миллисекундах

// Очистка старых сообщений каждые 10 минут
setInterval(() => {
  const now = Date.now();
  messages = messages.filter(m => now - m.timestamp < MESSAGE_LIFETIME);
  console.log('Cleaned old messages. Current count:', messages.length);
}, 10 * 60 * 1000);

// Регистрация нового пользователя
app.post('/register', (req, res) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
    return res.status(400).json({ error: 'Invalid nickname' });
  }
  const trimmed = nickname.trim();
  if (users.includes(trimmed)) {
    return res.status(400).json({ error: 'Nickname already taken' });
  }
  users.push(trimmed);
  res.json({ success: true, nickname: trimmed });
});

// Получить список всех пользователей (можно исключить себя через параметр exclude)
app.get('/users', (req, res) => {
  const { exclude } = req.query;
  let userList = users;
  if (exclude) {
    userList = users.filter(u => u !== exclude);
  }
  res.json(userList);
});

// Отправить сообщение
app.post('/messages', (req, res) => {
  const { from, to, text } = req.body;
  if (!from || !to || !text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Invalid message data' });
  }
  if (!users.includes(from) || !users.includes(to)) {
    return res.status(400).json({ error: 'Sender or recipient not registered' });
  }
  const message = {
    from: from.trim(),
    to: to.trim(),
    text: text.trim(),
    timestamp: Date.now()
  };
  messages.push(message);
  res.json({ success: true });
});

// Получить все сообщения, где пользователь участвует (отправитель или получатель)
app.get('/messages/:user', (req, res) => {
  const { user } = req.params;
  const { since } = req.query; // опционально – только новые сообщения после указанной метки времени
  if (!users.includes(user)) {
    return res.status(404).json({ error: 'User not found' });
  }
  let userMessages = messages.filter(m => m.from === user || m.to === user);
  if (since) {
    const sinceTs = parseInt(since);
    if (!isNaN(sinceTs)) {
      userMessages = userMessages.filter(m => m.timestamp > sinceTs);
    }
  }
  // Сортировка по времени (от старых к новым)
  userMessages.sort((a, b) => a.timestamp - b.timestamp);
  res.json(userMessages);
});

// Простой пинг для поддержания активности сервера (Render не «усыпит» сервер)
app.get('/ping', (req, res) => {
  res.json({ pong: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
