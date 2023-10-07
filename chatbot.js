const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ejs = require('ejs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Registrationform', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Database Connection Established');
}).catch((err) => {
    console.error('Database Connection Error:', err);
});

// Load User model
const User = require('./models/users');

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        username,
        password: hashedPassword
    });

    try {
        await newUser.save();
        // res.status(201).send('<script>alert("User registered successfully!");</script>');
        res.status(201).render('Login.ejs', { message: 'User registered successfully!' });
        
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error (likely duplicate email)
            res.send('<script>alert("Email is already registered.");</script>');
        } else {
            console.error(error);
            res.status(500).send('<script>alert("An error occurred while processing your request.");</script>');
        }
    }
});

app.get('/Login', (req, res) => {
    res.render('Login');
});

app.post('/Login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
        return res.send('User not found.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
        // res.redirect('/chatbot'); // Redirect to the chatbot page
        res.sendFile(path.join(__dirname, 'index.html'));
        
    } else {
        return res.status(403).send('Incorrect password.');
    }
});

// Chatbot Socket.io code
io.on('connection', (socket) => {
    console.log('Connected...');
    socket.on('message', (msg) => {
        socket.broadcast.emit('message', msg);
    });
});

// Serve chatbot page
app.get('/chatbot', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
