[![MIT License](https://img.shields.io/github/license/daxxac/shkalim)](./LICENSE)
[![Issues](https://img.shields.io/github/issues/daxxac/shkalim)](https://github.com/daxxac/shkalim/issues)
[![Stars](https://img.shields.io/github/stars/daxxac/shkalim?style=social)](https://github.com/daxxac/shkalim/stargazers)
[![Forks](https://img.shields.io/github/forks/daxxac/shkalim?style=social)](https://github.com/daxxac/shkalim/network/members)
[![Pull Requests](https://img.shields.io/github/issues-pr/daxxac/shkalim)](https://github.com/daxxac/shkalim/pulls)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

# Shkalim

**Shkalim** is an open source personal finance tracker for Israel. Analyze your income and expenses from Israeli banks (MAX, Discount, CAL) with full privacy: all data stays on your device. No ads, no tracking, no server-side storage.

---

## Features

- **Local-First Privacy:** All financial data is processed and stored locally (browser or desktop app). Nothing is sent to our servers by default.
- **Bank Statement Import:** Supports manual upload of statements from MAX, Discount, CAL (CSV/XLSX).
- **Automatic Sync (Desktop):** Optional, secure local sync with Israeli banks (no credentials leave your device).
- **Data Encryption:** Local encryption with your own password (desktop version).
- **Analytics & Visualization:** Clear charts, category breakdowns, monthly trends, and more.
- **Multi-language:** English, Russian, Hebrew.
- **Open Source:** Community contributions welcome!

---

## Quick Start

### 1. Clone the repository
```sh
git clone https://github.com/daxxac/shkalim.git
cd shkalim
```

### 2. Install dependencies
```sh
npm install
```

### 3. Start the development server
```sh
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

---

## Technologies
- React + TypeScript
- Vite
- shadcn-ui
- Tailwind CSS
- Zustand (state management)
- Supabase (optional cloud features)
- Tauri (desktop app)

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

## Privacy Policy & Terms

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) and [TERMS_AND_CONDITIONS.md](./TERMS_AND_CONDITIONS.md) for details on data usage and user rights.

---

## Contact & Contributing

- Issues and pull requests are welcome!
- For questions, contact: support@shkalim.com
- Follow the author on Instagram: [@daxxac](https://instagram.com/daxxac)
