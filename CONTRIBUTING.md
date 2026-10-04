# Contributing to Smart Hospital Management System (SHMS)

Thank you for considering contributing to SHMS! This document provides guidelines for contributing code, reporting issues, and submitting pull requests.

---

## 🛠️ Development Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Somya007tiwari/SHMS-project.git
   cd SHMS-project
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

---

## 📜 Database Migrations

Always run database migrations through the migration runner:
```bash
npm --prefix backend run migrate -- --yes
```

---

## 🧪 Testing & Validation

Before submitting a pull request, ensure all checks pass:
- Run syntax check: `node --check backend/server.js`
- Build frontend: `npm --prefix frontend run build`

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
