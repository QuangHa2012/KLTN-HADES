require('dotenv').config()

const express = require('express')
const { engine } = require('express-handlebars')
const session = require('express-session')
const cartCount = require('./app/middleware/cartCount')
const chatHistory = require('./app/middleware/chatHistory')
const path = require('path')
const passport = require('./config/passport')
const app = express()
const port = process.env.PORT || 3000

const route = require('./routes/index') //import route()

//static
app.use(express.static(path.join(__dirname, 'public')))

//process data submitted via the form
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    rolling: true, // reset lại thời gian cookie mỗi lần request
    cookie: { maxAge: 60000 * 60 } // 1h
  })
)

// passport
app.use(passport.initialize())
app.use(passport.session())

// Truyền user vào tất cả view
app.use((req, res, next) => {
  res.locals.user = req.session.user || req.user || null
  next()
})

app.get('/debug-session', (req, res) => {
  res.send(req.session.user)
})

//chat history middleware
app.use(chatHistory)

//count cart items
app.use(cartCount)

//template engine
app.engine(
  'hbs',
  engine({
    extname: '.hbs',
    helpers: {
      formatPrice: price => {
        if (price == null) return ''
        return price.toLocaleString('vi-VN', {
          style: 'currency',
          currency: 'VND'
        })
      },
      eq: (a, b) => a === b,
      ne: (a, b) => a !== b,
      or: (a, b) => a || b,
      gt: (a, b) => a > b,
      lt: (a, b) => a < b,
      lte: (a, b) => a <= b,
      add: (a, b) => a + b,
      sub: (a, b) => a - b,
      multiply: (a, b) => a * b,
      calcTotal: items => {
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
      formatDate: date => new Date(date).toLocaleString('vi-VN'),
      formatBD: date => new Date(date).toLocaleDateString('vi-VN'),
      range: (from, to) => {
        let arr = []
        for (let i = from; i <= to; i++) arr.push(i)
        return arr
      },
      orderStatus: function (status) {
        switch (status) {
          case 'pending':
            return 'Đang xử lý'
          case 'paid':
            return 'Đã thanh toán'
          case 'failed':
            return 'Thanh toán thất bại'
          case 'shipping':
            return 'Đang giao hàng'
          case 'cancelled':
            return 'Đã hủy'
          default:
            return status
        }
      },
      ifIndexZero: function (index) {
        return index === 0 ? 'active' : ''
      },
      ifEquals: function (a, b, options) {
            return (a === b) ? options.fn(this) : options.inverse(this);
        },
      rangeStar: (from, to, step = 1) => {
        let arr = []
        if (step > 0) {
          for (let i = from; i <= to; i += step) arr.push(i)
        } else {
          for (let i = from; i >= to; i += step) arr.push(i)
        }
        return arr
      }
    }
  })
)
app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, 'resources', 'views')) //__dirname fix path folder đi từ src -> resources -> views

//init routes
route(app)

// Middleware bắt lỗi toàn hệ thống
app.use((err, req, res, next) => {
  console.error("Lỗi hệ thống:", err.message);

  // Nếu lỗi liên quan đến SQL Server bị ngắt kết nối
  if (
    err.message.includes("Connection") ||
    err.message.includes("connect") ||
    err.message.includes("ECONN") ||
    err.code === "ELOGIN"
  ) {
    return res.status(500).render("500", {
      message: "Hệ thống đang bảo trì. Vui lòng quay lại sau!"
    });
  }

  // Các lỗi khác
  res.status(500).render("500", {
    message: "Đã xảy ra lỗi trong hệ thống!"
  });
});

// Socket.io setup for real-time chat
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const MessageModel = require('./app/models/messageModel');

global.userSockets = {};

io.on('connection', socket => {
  console.log('Socket connected', socket.id);

  socket.on('register', data => {
    if (!data || !data.userId) return;
    userSockets[data.userId] = socket.id;
  });

  // User gửi tin nhắn
  socket.on('userMessage', async data => {
    const userId = data.userId;
    const adminId = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : 6;

    await MessageModel.saveMessage(userId, adminId, data.message, 0);

    const adminSocket = userSockets[adminId];
    if (adminSocket)
      io.to(adminSocket).emit('receiveMessage', {
        senderId: userId,
        receiverId: adminId,
        message: data.message,
        isAdmin: 0,
        createdAt: new Date()
      });
  });

  // Admin gửi tin nhắn
  socket.on('adminMessage', async data => {
    const adminId = data.adminId || (process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : 6);
    const userId = data.userId;

    await MessageModel.saveMessage(adminId, userId, data.message, 1);

    const userSocket = userSockets[userId];
    if (userSocket)
      io.to(userSocket).emit('receiveMessage', {
        senderId: adminId,
        receiverId: userId,
        message: data.message,
        isAdmin: 1,
        createdAt: new Date()
      });
  });

  socket.on('disconnect', () => {
    for (const uid in userSockets) {
      if (userSockets[uid] === socket.id) delete userSockets[uid];
    }
  });
});

app.set('io', io);
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
