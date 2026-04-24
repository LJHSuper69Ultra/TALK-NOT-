// filepath: client/renderer.js

// State
let currentUser = null;
let selectedChat = null;
let selectedRoom = null;
let chatType = 'friends'; // 'friends' or 'rooms'
let ws = null;
let pendingRoomJoin = null; // For password-protected rooms

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const registerConfirm = document.getElementById('register-confirm');
const friendList = document.getElementById('friend-list');
const roomList = document.getElementById('room-list');
const messagesContainer = document.getElementById('messages');
const chatWith = document.getElementById('chat-with');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const roomModal = document.getElementById('room-modal');
const joinRoomModal = document.getElementById('join-room-modal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    setupEventListeners();
});

// WebSocket Connection
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('Connected to server');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        // Try to reconnect after 3 seconds
        setTimeout(initWebSocket, 3000);
    };
}

// Handle Server Messages
function handleServerMessage(data) {
    switch (data.type) {
        case 'loginSuccess':
            handleLoginSuccess(data.user);
            break;
        case 'registerSuccess':
            handleRegisterSuccess(data.user);
            break;
        case 'error':
            showError(data.message);
            break;
        case 'userList':
            renderFriendList(data.users);
            break;
        case 'chat':
            receiveMessage(data);
            break;
        case 'chatSent':
            // Add own message to UI immediately
            addMessageToUI(data.message.text, true, data.message.timestamp, false);
            scrollToBottom();
            break;
        case 'messages':
            renderMessages(data.messages);
            break;
        case 'typing':
            showTypingIndicator(data.from);
            break;
        case 'messagesRead':
            updateReadStatus(data.by);
            break;
        // Room handlers
        case 'roomList':
            renderRoomList(data.rooms);
            break;
        case 'roomCreated':
            // Refresh room list
            ws.send(JSON.stringify({ type: 'getRooms', username: currentUser.username }));
            break;
        case 'roomJoined':
            selectRoom(data.room);
            break;
        case 'roomLeft':
            ws.send(JSON.stringify({ type: 'getRooms', username: currentUser.username }));
            break;
        case 'roomMessage':
            receiveRoomMessage(data);
            break;
        case 'roomMessages':
            renderMessages(data.messages);
            break;
        case 'userJoinedRoom':
        case 'userLeftRoom':
            // Refresh room list
            ws.send(JSON.stringify({ type: 'getRooms', username: currentUser.username }));
            break;
    }
}

// Event Listeners
function setupEventListeners() {
    // Auth tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    // Login
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Register
    document.getElementById('register-btn').addEventListener('click', handleRegister);
    registerConfirm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    // Chat input
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Typing indicator
    messageInput.addEventListener('input', () => {
        if (selectedChat && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'typing',
                from: currentUser.username,
                to: selectedChat
            }));
        }
    });
}

// Chat Type Switch (Friends/Rooms)
function switchChatType(type) {
    chatType = type;
    
    document.querySelectorAll('.chat-type-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.type === type) {
            t.classList.add('active');
        }
    });

    if (type === 'friends') {
        friendList.classList.remove('hidden');
        roomList.classList.add('hidden');
    } else {
        friendList.classList.add('hidden');
        roomList.classList.remove('hidden');
        // Request room list
        ws.send(JSON.stringify({
            type: 'getRooms',
            username: currentUser.username
        }));
    }
    
    // Clear selection
    selectedChat = null;
    selectedRoom = null;
    chatWith.textContent = type === 'friends' ? '채팅방을 선택하세요' : '그룹을 선택하세요';
    messageInput.disabled = true;
    sendBtn.disabled = true;
    messagesContainer.innerHTML = '<div class="empty-state"><p>대화상대를 선택해주세요</p></div>';
}

// Auth Functions
function switchAuthTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');

    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
    clearError();
}

function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
        showError('아이디와 비밀번호를 입력해주세요');
        return;
    }

    ws.send(JSON.stringify({
        type: 'login',
        username: username,
        password: password
    }));
}

function handleRegister() {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    const confirm = registerConfirm.value.trim();

    if (!username || !password) {
        showError('아이디와 비밀번호를 입력해주세요');
        return;
    }

    if (password !== confirm) {
        showError('비밀번호가 일치하지 않습니다');
        return;
    }

    if (password.length < 4) {
        showError('비밀번호는 4자 이상이어야 합니다');
        return;
    }

    ws.send(JSON.stringify({
        type: 'register',
        username: username,
        password: password
    }));
}

function handleLoginSuccess(user) {
    currentUser = user;
    authScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    clearAuthForm();
    
    // Request user list
    ws.send(JSON.stringify({ type: 'getUsers' }));
}

function handleRegisterSuccess(user) {
    showError('회원가입 성공! 로그인해주세요');
    switchAuthTab('login');
    loginUsername.value = registerUsername.value;
    registerUsername.value = '';
    registerPassword.value = '';
    registerConfirm.value = '';
}

function clearAuthForm() {
    loginUsername.value = '';
    loginPassword.value = '';
    registerUsername.value = '';
    registerPassword.value = '';
    registerConfirm.value = '';
    clearError();
}

function showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();

    // Add new error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const activeForm = document.querySelector('.auth-form.active');
    activeForm.appendChild(errorDiv);

    // Auto remove after 3 seconds
    setTimeout(() => errorDiv.remove(), 3000);
}

function clearError() {
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
}

// Friend List
function renderFriendList(users) {
    friendList.innerHTML = '';

    // Filter out current user
    const otherUsers = users.filter(u => u.username !== currentUser?.username);

    if (otherUsers.length === 0) {
        friendList.innerHTML = '<div class="no-friends">친구가 없습니다</div>';
        return;
    }

    otherUsers.forEach(user => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.dataset.username = user.username;
        
        const initial = user.username.charAt(0).toUpperCase();
        
        friendItem.innerHTML = `
            <div class="friend-avatar">${initial}</div>
            <div class="friend-info">
                <div class="friend-name">${user.username}</div>
                <div class="friend-status">${user.online ? '온라인' : '오프라인'}</div>
            </div>
            ${user.online ? '<div class="online-indicator"></div>' : ''}
        `;

        friendItem.addEventListener('click', () => selectChat(user.username));
        friendList.appendChild(friendItem);
    });
}

// Room Functions
function renderRoomList(rooms) {
    roomList.innerHTML = '';

    if (rooms.length === 0) {
        roomList.innerHTML = '<div class="no-rooms">참여한 그룹이 없습니다</div>';
        return;
    }

    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.dataset.roomId = room.id;
        
        roomItem.innerHTML = `
            <div class="room-avatar">👥</div>
            <div class="room-info">
                <div class="room-name">${escapeHtml(room.name)}</div>
                <div class="room-members">${room.members.length}명</div>
            </div>
            ${room.password ? '<span class="room-lock">🔒</span>' : ''}
        `;

        roomItem.addEventListener('click', () => selectRoom(room));
        roomList.appendChild(roomItem);
    });
}

function selectRoom(room) {
    selectedRoom = room;
    selectedChat = null;
    
    // Update UI
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.roomId === room.id) {
            item.classList.add('active');
        }
    });

    chatWith.textContent = room.name;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();

    // Load room messages
    ws.send(JSON.stringify({
        type: 'getRoomMessages',
        roomId: room.id
    }));
}

function handleCreateRoom() {
    const roomName = document.getElementById('room-name').value.trim();
    const roomPassword = document.getElementById('room-password').value.trim();

    if (!roomName) {
        showError('방 이름을 입력해주세요');
        return;
    }

    ws.send(JSON.stringify({
        type: 'createRoom',
        name: roomName,
        password: roomPassword || null,
        owner: currentUser.username
    }));

    roomModal.classList.add('hidden');
    document.getElementById('room-name').value = '';
    document.getElementById('room-password').value = '';
}

function handleJoinRoomConfirm() {
    const password = document.getElementById('join-room-password').value.trim();
    
    if (pendingRoomJoin) {
        ws.send(JSON.stringify({
            type: 'joinRoom',
            roomId: pendingRoomJoin.id,
            username: currentUser.username,
            password: password || null
        }));
        
        joinRoomModal.classList.add('hidden');
        document.getElementById('join-room-password').value = '';
        pendingRoomJoin = null;
    }
}

function requestJoinRoom(room) {
    if (room.password) {
        pendingRoomJoin = room;
        document.getElementById('join-room-name').textContent = room.name;
        joinRoomModal.classList.remove('hidden');
    } else {
        ws.send(JSON.stringify({
            type: 'joinRoom',
            roomId: room.id,
            username: currentUser.username,
            password: null
        }));
    }
}

// Chat Functions
function selectChat(username) {
    selectedChat = username;
    
    // Update UI
    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.username === username) {
            item.classList.add('active');
        }
    });

    chatWith.textContent = username;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();

    // Load messages
    ws.send(JSON.stringify({
        type: 'getMessages',
        from: currentUser.username,
        to: username
    }));
}

function renderMessages(messages) {
    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
        messagesContainer.innerHTML = '<div class="empty-state"><p>메시지가 없습니다</p></div>';
        return;
    }

    messages.forEach(msg => {
        // Check if it's a room message (has roomId) or 1:1 message
        const isRoomMessage = msg.roomId !== undefined;
        const isMe = isRoomMessage ? (msg.sender === currentUser.username) : (msg.sender === currentUser.username);
        addMessageToUI(msg.text, isMe, msg.timestamp, msg.read);
    });

    scrollToBottom();
}

function addMessageToUI(text, isMe, timestamp, read = false) {
    // Remove empty state if exists
    const emptyState = messagesContainer.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isMe ? 'me' : 'other'}`;

    const time = new Date(timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.innerHTML = `
        <div class="message-bubble">${escapeHtml(text)}</div>
        <div class="message-info">
            <span class="message-time">${time}</span>
            ${isMe && read ? '<span class="message-read">✔</span>' : ''}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
}

function receiveMessage(data) {
    if (selectedChat === data.from) {
        addMessageToUI(data.text, false, data.timestamp);
        scrollToBottom();
        
        // Mark as read
        ws.send(JSON.stringify({
            type: 'read',
            from: currentUser.username,
            to: data.from
        }));
    }
    // If not selected, could show notification
}

function receiveRoomMessage(data) {
    if (selectedRoom && selectedRoom.id === data.roomId) {
        const isMe = data.from === currentUser.username;
        addMessageToUI(data.text, isMe, data.timestamp, false);
        scrollToBottom();
    }
    // If not selected, could show notification
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    if (selectedRoom) {
        // Group chat
        ws.send(JSON.stringify({
            type: 'roomChat',
            roomId: selectedRoom.id,
            from: currentUser.username,
            text: text
        }));
    } else if (selectedChat) {
        // 1:1 chat
        ws.send(JSON.stringify({
            type: 'chat',
            from: currentUser.username,
            to: selectedChat,
            text: text
        }));
    }

    messageInput.value = '';
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator(from) {
    if (selectedChat !== from) return;

    let indicator = document.querySelector('.typing-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        messagesContainer.appendChild(indicator);
    }

    indicator.classList.add('active');
    scrollToBottom();

    // Hide after 3 seconds
    setTimeout(() => {
        indicator.classList.remove('active');
    }, 3000);
}

function updateReadStatus(by) {
    // Update read status for messages sent to 'by'
    const messages = messagesContainer.querySelectorAll('.message.me');
    messages.forEach(msg => {
        const readIndicator = msg.querySelector('.message-read');
        if (readIndicator && !readIndicator.classList.contains('read')) {
            readIndicator.textContent = '✔✔';
            readIndicator.classList.add('read');
        }
    });
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}