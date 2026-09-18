# Super Shine Pitambari

Modern, high-performance e-commerce storefront and administration portal for **Super Shine Pitambari** shining powder and cleaning solutions.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Firebase**.

---

## ✨ Features

- **Storefront**: High-converting, responsive landing & shopping pages with smooth GSAP / Lenis interactions.
- **Product Catalog & Cart**: Dynamic cart management powered by Zustand with persistent local state.
- **Checkout & Orders**: Streamlined checkout workflow and order tracking.
- **Admin Dashboard**: Comprehensive order, inventory, and customer management dashboard.
- **Authentication & Backend**: Firebase Authentication & Cloud Firestore with role-based access control.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: GSAP & Lenis smooth scroll
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Backend / Database**: [Firebase](https://firebase.google.com/) (Firestore, Auth, Storage, Admin SDK)
- **Validation**: [Zod](https://zod.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [pnpm](https://pnpm.io/) (`corepack enable pnpm` or `npm i -g pnpm`)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/himavolt3569-design/pitambari.git
cd pitambari
pnpm install
```

### 3. Environment Variables

Create `.env.local` using `.env.example` as a template:

```bash
cp .env.example .env.local
```

Fill in your Firebase credentials in `.env.local`.

### 4. Running Locally

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Starts Next.js development server |
| `pnpm build` | Compiles and builds production bundle |
| `pnpm start` | Runs the production build |
| `pnpm lint` | Runs ESLint |
| `pnpm typecheck` | Validates TypeScript types |
| `pnpm test` | Runs unit tests with Vitest |
| `pnpm seed` | Seeds Firestore with sample products and data |
| `pnpm create-admin` | Seeds initial admin user |
| `pnpm grant-admin` | Grants admin claims to an existing user |

---

## 🔒 License

Private repository. All rights reserved.
