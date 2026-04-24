# 💬 TALK-NOT

> **실시간 채팅 애플리케이션**

---

## 🎯 프로젝트 소개

TALK-NOT은 단순한 채팅 앱입니다.

Electron + WebSocket 기반으로
실제 동작하는 **온라인 채팅 시스템**을 구현합니다.

---

## 🚀 주요 기능

### 💬 채팅 시스템

* 1:1 실시간 채팅 (WebSocket)
* 메시지 송수신
* 메시지 저장 (SQLite)

### 👤 사용자 시스템

* 로그인 / 회원가입
* 세션 유지

### 🖥️ UI (핵심)

* 📱 2010년대 카카오톡 스타일
* 🟡 노란색 메시지 (내 메시지)
* ⚪ 흰색 메시지 (상대 메시지)
* 👥 좌측 친구 목록 / 우측 채팅창 구조

---

## 🛠️ 기술 스택

### Client

* Electron
* HTML / CSS / Vanilla JS

### Server

* Node.js
* WebSocket (`ws`) 

### Database

* SQLite

---

## 📦 실행 방법

```bash
git clone https://github.com/LJHSuper69Ultra/TALK-NOT-.git
cd TALK-NOT-
npm install
```

### ▶ 서버 실행

```bash
npm start
```

### ▶ Electron 실행

```bash
npm run electron
```

### ▶ 개발 모드

```bash
npm run dev
```

---

## 📁 프로젝트 구조

```
TALK-NOT-
├─ client/
│  ├─ main.js        # Electron 엔트리
│  ├─ renderer.js    # UI 로직
│  ├─ index.html
│  └─ style.css
│
├─ server/
│  └─ server.js      # WebSocket 서버
│
├─ database/
│  └─ sqlite.db
│
├─ package.json
└─ README.md
```

---

## 🎨 UI 컨셉

* Primary Color: `#FEE500`
* Background: `#F2F2F2`
* Rounded UI + Gradient

---

## 🔌 네트워크 구조

WebSocket 기반 실시간 통신

```json
{
  "type": "chat",
  "from": "user1",
  "to": "user2",
  "text": "hello"
}
```

---

## 🗄️ 데이터베이스 구조

### users

* id
* username
* password

### messages

* id
* sender
* receiver
* text
* timestamp

---

## 🔥 개발 단계

1. 기본 채팅 기능
2. DB 연동
3. UI 완성 
4. 고급 기능 (읽음, 알림)

---

## ⚠️ 주의사항

* `node_modules`는 포함되지 않습니다
* 실행 전 반드시 `npm install` 필요
* Electron 실행 시 별도 터미널 필요

---

## 📸 스크린샷

> (여기에 UI 캡처 넣으면 완성도 급상승)

---

## 📄 라이선스

MIT License

---

## 🙌 목표

> 단순한 채팅 앱이 아니라
> **“레트로 카카오톡을 구현한 완성도 높은 포트폴리오”**
