# AGENTS.md

## 🎯 Project Overview

Electron 기반 데스크톱 채팅 애플리케이션을 개발한다.
UI는 2010년대 초반 카카오톡(Android 3.0 스타일, Frutiger Aero 감성)을 재현한다.
실시간 온라인 채팅을 지원한다.

---

## 🧠 Agent Role

* 시니어 풀스택 개발자로 행동한다.
* 코드 품질, 실행 가능성, 유지보수성을 최우선으로 한다.
* 항상 기존 코드 스타일을 유지한다.

---

## 🏗️ Architecture

### Client

* Electron
* HTML / CSS / Vanilla JS

### Server

* Node.js
* WebSocket (ws)

### Database

* SQLite (기본)
* 메시지 및 사용자 데이터 저장

---

## 📁 Directory Structure

client/

* main.js (Electron entry)
* renderer.js (UI logic)
* index.html
* style.css

server/

* server.js

database/

* sqlite.db

---

## ⚙️ Core Features

1. Authentication

   * 로그인 / 회원가입
   * 세션 유지

2. Chat System

   * 1:1 채팅
   * 실시간 메시지 전송 (WebSocket)
   * 메시지 저장 및 로드

3. UI

   * 친구 목록 (좌측)
   * 채팅창 (우측)
   * 메시지 좌우 정렬 (me / other)
   * 읽음 표시 (✔)

---

## 🎨 UI Guidelines (VERY IMPORTANT)

* Primary Color: #FEE500
* Background: #F2F2F2
* Gradient 적극 사용
* Flat + 약한 입체감
* Rounded corners (border-radius)

### Message Style

* 내 메시지: 노란색 배경, 오른쪽 정렬
* 상대 메시지: 흰색 배경, 왼쪽 정렬

### Layout

* 좌측: 친구 목록
* 우측: 채팅

---

## 🔌 Networking Rules

* WebSocket 사용
* 메시지는 JSON 형식으로 송수신

### Example

{
"type": "chat",
"from": "user1",
"to": "user2",
"text": "hello"
}

---

## 🗄️ Database Schema

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

## 🧪 Coding Rules

* 모든 코드는 실행 가능해야 한다.
* 불필요한 라이브러리 사용 금지
* ES6 문법 사용
* async/await 사용
* 에러 처리 반드시 포함

---

## 🚫 Forbidden

* 더미 코드 작성 금지
* TODO만 남기고 끝내기 금지
* 불완전한 함수 금지

---

## ✅ Output Requirements

에이전트는 항상 다음을 포함해야 한다:

1. 수정된 파일 전체 코드
2. 변경 이유 설명
3. 실행 방법

---

## 🚀 Development Strategy

* Step 1: 기본 채팅 기능 구현
* Step 2: DB 연동
* Step 3: UI 개선 (카카오톡 스타일)
* Step 4: 고급 기능 (읽음, 알림)

---

## 🧠 Behavior Rules

* 기존 코드 먼저 분석 후 수정
* 필요 시 최소 변경 원칙 적용
* 기능 추가 시 구조 확장 고려

---

## 📌 Goal

"단순한 채팅앱이 아니라
옛날 카카오톡을 재현한 완성도 높은 포트폴리오"

---
