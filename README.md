This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## YouTube subscription verification

The Missions tab verifies subscriptions to the ZX-Earn_Officil channel with Google OAuth and the YouTube Data API v3. To enable it:

1. Enable the YouTube Data API v3 in a Google Cloud project and configure the OAuth consent screen.
2. Create a Google OAuth client with the **Web application** type.
3. Add the exact callback URL as an authorized redirect URI, for example `https://zx-tap.pages.dev/api/youtube/callback`.
4. Set these server-side environment variables in the deployment:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (the exact callback URL registered above)
   - `DATABASE_URL` (the existing Neon database connection)

For local development, register `http://localhost:3000/api/youtube/callback` as an additional redirect URI and use it for `GOOGLE_REDIRECT_URI`. The app stores only the verified Telegram user ID and channel ID; Google access tokens are not retained.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
