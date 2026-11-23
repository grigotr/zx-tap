import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "ZX Tap | Zenith Xecution",
  description: "ZX Tap Telegram Mini App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://sad.adsgram.ai/js/sad.min.js"
          strategy="beforeInteractive"
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
          html, body {
            height: 100%;
            width: 100%;
            background: radial-gradient(circle at 50% 15%, #0f172a 0%, #09090b 80%);
            color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            user-select: none;
          }
          .zx-container {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100dvh;
            max-width: 440px;
            margin: 0 auto;
            padding: 12px 16px 14px;
          }
          .zx-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(24, 24, 27, 0.88);
            border: 1px solid rgba(34, 211, 238, 0.25);
            border-radius: 16px;
            padding: 10px 14px;
            backdrop-filter: blur(10px);
          }
          .zx-brand { font-size: 10px; letter-spacing: 0.14em; color: #22d3ee; font-weight: 700; }
          .zx-user { font-size: 15px; font-weight: 700; color: #ffffff; margin-top: 2px; }
          .zx-badge {
            background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(34, 211, 238, 0.2));
            border: 1px solid rgba(234, 179, 8, 0.45);
            color: #facc15;
            padding: 5px 11px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
          }
          .zx-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow-y: auto;
            padding: 10px 0;
          }
          .zx-balance-box { text-align: center; }
          .zx-balance-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #a1a1aa; }
          .zx-balance-value {
            font-size: 40px;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(180deg, #ffffff 20%, #22d3ee 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-top: 2px;
          }
          .zx-coin-wrap {
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
            min-height: 195px;
          }
          .zx-coin {
            width: 190px;
            height: 190px;
            border-radius: 50%;
            border: 4px solid #22d3ee;
            background: radial-gradient(circle at 35% 30%, #1e293b 0%, #09090b 80%);
            box-shadow: 0 0 42px rgba(34, 211, 238, 0.35), inset 0 0 22px rgba(34, 211, 238, 0.25);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.08s ease, box-shadow 0.08s ease;
          }
          .zx-coin:active {
            transform: scale(0.94);
            box-shadow: 0 0 60px rgba(250, 204, 21, 0.55), inset 0 0 28px rgba(34, 211, 238, 0.45);
            border-color: #facc15;
          }
          .zx-coin-title { font-size: 30px; font-weight: 900; letter-spacing: 0.08em; color: #22d3ee; }
          .zx-coin-sub { font-size: 10px; letter-spacing: 0.18em; color: #94a3b8; margin-top: 5px; }
          .zx-energy-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #e4e4e7; margin-bottom: 6px; }
          .zx-bar-bg { width: 100%; height: 9px; background: #18181b; border-radius: 999px; overflow: hidden; border: 1px solid #27272a; }
          .zx-bar-fill { height: 100%; background: linear-gradient(90deg, #06b6d4, #facc15); border-radius: 999px; transition: width 0.15s ease; }
          .zx-card {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #18181b 0%, #0f172a 100%);
            border: 1px solid rgba(34, 211, 238, 0.28);
            border-radius: 14px;
            padding: 12px 14px;
            color: #ffffff;
          }
          .zx-btn-pill {
            background: rgba(250, 204, 21, 0.16);
            border: 1px solid rgba(250, 204, 21, 0.45);
            color: #facc15;
            padding: 6px 12px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
          }
          .zx-btn-pill:disabled { opacity: 0.45; cursor: not-allowed; }
          .zx-btn-cyan {
            background: rgba(34, 211, 238, 0.16);
            border: 1px solid rgba(34, 211, 238, 0.45);
            color: #22d3ee;
            padding: 6px 12px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
          }
          .zx-nav {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            background: rgba(24, 24, 27, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 6px;
            margin-top: 8px;
          }
          .zx-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 8px 4px;
            border-radius: 12px;
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          }
          .zx-nav-item.active {
            background: linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(250, 204, 21, 0.12));
            color: #22d3ee;
            border: 1px solid rgba(34, 211, 238, 0.35);
          }
          .zx-soon-tag {
            background: rgba(250, 204, 21, 0.18);
            border: 1px solid #facc15;
            color: #facc15;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            padding: 4px 12px;
            border-radius: 999px;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}