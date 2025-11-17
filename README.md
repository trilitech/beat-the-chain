# Beat the Chain

A typing game inspired by [monkeytype](https://monkeytype.com) that gives users a visual representation of sub-block confirmations on [Etherlink](https://etherlink.com).

[Etherlink](https://etherlink.com) is a [Tezos](https://tezos.com) EVM-compatible L2 that brings Ethereum compatibility to the Tezos ecosystem. Learn more about Etherlink's latest upgrade, [Ebisu](https://medium.com/@etherlink/announcing-ebisu-a-5th-upgrade-proposal-for-etherlink-mainnet-4dfdd1c8819e), which introduces sub-block latency features.

## What It Is

**Beat the Chain** is an interactive typing test that challenges players to type faster than Etherlink's sub-block confirmation speed. As you type, green blocks appear on screen at the same pace as Etherlink's sub-block confirmations (200ms per letter), creating a visual representation of how fast sub-blocks are being created on the network.

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
- **Get a Rank:** You MUST have 90%+ accuracy to earn a rank.

### Ranks

- **Pro:** < 150ms / letter (Insane!)
- **Sub-blocks:** 150-200ms / letter (You beat the chain!)
- **Etherlink:** 201-500ms / letter (Solid speed)
- **Beginner:** > 500ms / letter (or < 90% acc)

## Getting Started

First, run the development server:

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
