# Proof of Speed

A typing game inspired by [monkeytype](https://monkeytype.com) that gives users a visual representation of sub-block confirmations on [Etherlink](https://etherlink.com).

**[🎮 Play the game →](https://beat-the-chain-zeta.vercel.app/)**

[Etherlink](https://etherlink.com) is a [Tezos](https://tezos.com) EVM-compatible L2 that brings Ethereum compatibility to the Tezos ecosystem. Learn more about Etherlink's latest upgrade, [Ebisu](https://medium.com/@etherlink/announcing-ebisu-a-5th-upgrade-proposal-for-etherlink-mainnet-4dfdd1c8819e), which introduces sub-block latency features.

## What It Is

**Proof of Speed** is an interactive typing test that challenges players to type faster than Etherlink's sub-block confirmation speed. As you type, green blocks appear on screen at the same pace as Etherlink's sub-block confirmations (200ms per letter), creating a visual representation of how fast sub-blocks are being created on the network.

Etherlink's new sub-block latency feature gives developers super-fast confirmation — around 10–20 milliseconds — so they instantly know their transaction will make it into the next block.

It's different from Base's Flashblocks because Etherlink uses a first-come, first-serve system, not a gas auction.

It's like being told "you're next in line" at lightning speed — no bidding, no waiting.

## Why It Matters

- **Developers** (especially DeFi and bot builders) get instant feedback that their transaction is locked in.
- Enables faster decision loops for trading, arbitrage, and oracle updates.
- Shows Etherlink's technical maturity and UX focus, not just raw block time.

## Game Mechanics

- **Race the Pacer:** Type the full text before the green blocks are completely formed.
- **Accuracy is Key:** Your Final Score is (LPS × Accuracy). Sloppy typing won't win.
- **Get a Rank:** Your rank is based on your typing speed and accuracy. Faster and more accurate typing = better blockchain rank!

### Ranks

Your typing speed determines which blockchain you match:

- **Etherlink/Base/Unichain:** 150-200ms / letter (Lightning fast!)
- **Solana:** 201-400ms / letter (Super fast!)
- **ETH Layer2s:** 401-1000ms / letter (Fast!)
- **Polygon:** 1001-2000ms / letter (Quick!)
- **Ethereum Mainnet:** 2001-12000ms / letter (Standard speed)
- **Bitcoin:** > 12000ms / letter (Slow and steady)

## Getting Started

### Prerequisites

Before running the project, you need to set up Supabase environment variables:

1. Create a `.env.local` file in the project root directory
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

⚠️ **Important**: Never commit `.env.local` to git! It's already in `.gitignore`.

### Running the Development Server

Once your environment variables are set up, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Supabase](https://supabase.com) - Database and backend
- [Tailwind CSS](https://tailwindcss.com) - Styling

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

