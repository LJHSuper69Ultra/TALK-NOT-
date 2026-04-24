// filepath: server/server.js
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DB_PATH = path.join(__dirname, '..', 'database', 'sqlite.db');

// Simple JSON file-based database
const DB_FILE = path.join(__dirname, '..', 'database', 'data.json');

// Ensure database directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [],
            messages: [],
            rooms: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return { users: [], messages: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// HTTP server for static files
const server = http.createServer((req, res) => {
    let filePath = '';
    if (req.url === '/' || req.url === '/index.html') {
        filePath = path.join(__dirname, '..', 'client', 'index.html');
    } else if (req.url === '/style.css') {
        filePath = path.join(__dirname, '..', 'client', 'style.css');
    } else if (req.url === '/renderer.js') {
        filePath = path.join(__dirname, '..', 'client', 'renderer.js');
    } else {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Error');
            return;
        }
        const ext = path.extname(filePath);
        const contentType = ext === '.html' ? 'text/html' : 
                          ext === '.css' ? 'text/css' : 'application/javascript';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Connected clients
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');
    let currentUser = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });

    ws.on('close', () => {
        if (currentUser) {
            clients.delete(currentUser);
            broadcastUserList();
        }
        console.log('Client disconnected');
    });

    function handleMessage(ws, data) {
        switch (data.type) {
            case 'register':
                handleRegister(data, ws);
                break;
            case 'login':
                handleLogin(data, ws);
                break;
            case 'chat':
                handleChat(data);
                break;
            case 'getUsers':
                sendUserList(ws);
                break;
            case 'getMessages':
                handleGetMessages(data, ws);
                break;
            case 'typing':
                handleTyping(data);
                break;
            case 'read':
                handleRead(data);
                break;
            // Group chat handlers
            case 'createRoom':
                handleCreateRoom(data, ws);
                break;
            case 'joinRoom':
                handleJoinRoom(data, ws);
                break;
            case 'leaveRoom':
                handleLeaveRoom(data, ws);
                break;
            case 'roomChat':
                handleRoomChat(data);
                break;
            case 'getRooms':
                handleGetRooms(data, ws);
                break;
            case 'getRoomMessages':
                handleGetRoomMessages(data, ws);
                break;
        }
    }

    function handleRegister(data, ws) {
        const db = readDB();
        const existingUser = db.users.find(u => u.username === data.username);
        
        if (existingUser) {
            ws.send(JSON.stringify({ type: 'error', message: 'Username already exists' }));
            return;
        }

        const newUser = {
            id: Date.now(),
            username: data.username,
            password: data.password
        };
        db.users.push(newUser);
        writeDB(db);

        ws.send(JSON.stringify({ type: 'registerSuccess', user: newUser }));
    }

    function handleLogin(data, ws) {
        const db = readDB();
        const user = db.users.find(u => u.username === data.username && u.password === data.password);
        
        if (!user) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid credentials' }));
            return;
        }

        currentUser = user.username;
        clients.set(user.username, ws);

        ws.send(JSON.stringify({ type: 'loginSuccess', user: user }));
        broadcastUserList();
    }

    function handleChat(data) {
        const db = readDB();
        const message = {
            id: Date.now(),
            sender: data.from,
            receiver: data.to,
            text: data.text,
            timestamp: new Date().toISOString(),
            read: false
        };
        db.messages.push(message);
        writeDB(db);

        // Send to receiver
        const receiverWs = clients.get(data.to);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({
                type: 'chat',
                from: data.from,
                text: data.text,
                timestamp: message.timestamp
            }));
        }

        // Send back to sender for confirmation
        const senderWs = clients.get(data.from);
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify({
                type: 'chatSent',
                message: message
            }));
        }
    }

    function handleGetMessages(data, ws) {
        const db = readDB();
        const messages = db.messages.filter(m => 
            (m.sender === data.from && m.receiver === data.to) ||
            (m.sender === data.to && m.receiver === data.from)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        ws.send(JSON.stringify({ type: 'messages', messages: messages }));

        // Mark messages as read
        db.messages = db.messages.map(m => {
            if (m.sender === data.to && m.receiver === data.from && !m.read) {
                return { ...m, read: true };
            }
            return m;
        });
        writeDB(db);

        // Notify sender that messages were read
        const senderWs = clients.get(data.to);
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify({ type: 'messagesRead', by: data.from }));
        }
    }

    function handleTyping(data) {
        const receiverWs = clients.get(data.to);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({
                type: 'typing',
                from: data.from
            }));
        }
    }

    function handleRead(data) {
        const db = readDB();
        db.messages = db.messages.map(m => {
            if (m.sender === data.from && m.receiver === data.to && !m.read) {
                return { ...m, read: true };
            }
            return m;
        });
        writeDB(db);

        const senderWs = clients.get(data.from);
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify({ type: 'messagesRead', by: data.to }));
        }
    }
    // Group Chat Functions
    function handleCreateRoom(data, ws) {
        const db = readDB();
        const roomId = Date.now().toString();
        const newRoom = {
            id: roomId,
            name: data.name,
            password: data.password || null,
            owner: data.owner,
            members: [data.owner],
            createdAt: new Date().toISOString()
        };
        db.rooms.push(newRoom);
        writeDB(db);

        ws.send(JSON.stringify({ type: 'roomCreated', room: newRoom }));
    }

    function handleJoinRoom(data, ws) {
        const db = readDB();
        const room = db.rooms.find(r => r.id === data.roomId);
        
        if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
        }

        if (room.password && room.password !== data.password) {
            ws.send(JSON.stringify({ type: 'error', message: 'Wrong password' }));
            return;
        }

        if (!room.members.includes(data.username)) {
            room.members.push(data.username);
            writeDB(db);
        }

        ws.send(JSON.stringify({ type: 'roomJoined', room: room }));

        // Notify other members
        room.members.forEach(member => {
            if (member !== data.username) {
                const memberWs = clients.get(member);
                if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                    memberWs.send(JSON.stringify({
                        type: 'userJoinedRoom',
                        roomId: room.id,
                        username: data.username
                    }));
                }
            }
        });
    }

    function handleLeaveRoom(data, ws) {
        const db = readDB();
        const room = db.rooms.find(r => r.id === data.roomId);
        
        if (!room) return;

        room.members = room.members.filter(m => m !== data.username);
        
        if (room.members.length === 0) {
            db.rooms = db.rooms.filter(r => r.id !== data.roomId);
        }
        writeDB(db);

        ws.send(JSON.stringify({ type: 'roomLeft', roomId: data.roomId }));

        // Notify remaining members
        room.members.forEach(member => {
            const memberWs = clients.get(member);
            if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                memberWs.send(JSON.stringify({
                    type: 'userLeftRoom',
                    roomId: room.id,
                    username: data.username
                }));
            }
        });
    }

    function handleRoomChat(data) {
        const db = readDB();
        const room = db.rooms.find(r => r.id === data.roomId);
        
        if (!room) return;

        const message = {
            id: Date.now(),
            roomId: data.roomId,
            sender: data.from,
            text: data.text,
            timestamp: new Date().toISOString()
        };
        db.messages.push(message);
        writeDB(db);

        // Send to all room members
        room.members.forEach(member => {
            const memberWs = clients.get(member);
            if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                memberWs.send(JSON.stringify({
                    type: 'roomMessage',
                    roomId: data.roomId,
                    from: data.from,
                    text: data.text,
                    timestamp: message.timestamp
                }));
            }
        });
    }

    function handleGetRooms(data, ws) {
        const db = readDB();
        const userRooms = db.rooms.filter(r => r.members.includes(data.username));
        ws.send(JSON.stringify({ type: 'roomList', rooms: userRooms }));
    }

    function handleGetRoomMessages(data, ws) {
        const db = readDB();
        const messages = db.messages
            .filter(m => m.roomId === data.roomId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        ws.send(JSON.stringify({ type: 'roomMessages', messages: messages }));
    }
    function sendUserList(ws) {
        const db = readDB();
        const onlineUsers = Array.from(clients.keys());
        const allUsers = db.users.map(u => ({
            username: u.username,
            online: onlineUsers.includes(u.username)
        }));
        ws.send(JSON.stringify({ type: 'userList', users: allUsers }));
    }

    function broadcastUserList() {
        const db = readDB();
        const onlineUsers = Array.from(clients.keys());
        const allUsers = db.users.map(u => ({
            username: u.username,
            online: onlineUsers.includes(u.username)
        }));

        clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'userList', users: allUsers }));
            }
        });
    }
});

// Start server
initDB();
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});