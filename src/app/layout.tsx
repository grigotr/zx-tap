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
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
          html, body {
            height: 100%;
            width: 100%;
            background: radial-gradient(circle at 50% 20%, #0f172a 0%, #09090b 75%);
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
            padding: 16px 20px 24px;
          }
          .zx-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(24, 24, 27, 0.85);
            border: 1px solid rgba(34, 211, 238, 0.25);
            border-radius: 16px;
            padding: 12px 16px;
            backdrop-filter: blur(10px);
          }
          .zx-brand { font-size: 11px; letter-spacing: 0.14em; color: #22d3ee; font-weight: 700; }
          .zx-user { font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px; }
          .zx-badge {
            background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(34, 211, 238, 0.2));
            border: 1px solid rgba(234, 179, 8, 0.45);
            color: #facc15;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 700;
          }
          .zx-balance-box { text-align: center; margin-top: 10px; }
          .zx-balance-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #a1a1aa; }
          .zx-balance-value {
            font-size: 44px;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(180deg, #ffffff 20%, #22d3ee 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-top: 4px;
          }
          .zx-coin-wrap {
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
          }
          .zx-coin {
            width: 210px;
            height: 210px;
            border-radius: 50%;
            border: 4px solid #22d3ee;
            background: radial-gradient(circle at 35% 30%, #1e293b 0%, #09090b 80%);
            box-shadow: 0 0 45px rgba(34, 211, 238, 0.35), inset 0 0 25px rgba(34, 211, 238, 0.25);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.08s ease, box-shadow 0.08s ease;
          }
          .zx-coin:active {
            transform: scale(0.94);
            box-shadow: 0 0 65px rgba(250, 204, 21, 0.55), inset 0 0 30px rgba(34, 211, 238, 0.45);
            border-color: #facc15;
          }
          .zx-coin-title { font-size: 32px; font-weight: 900; letter-spacing: 0.08em; color: #22d3ee; }
          .zx-coin-sub { font-size: 11px; letter-spacing: 0.18em; color: #94a3b8; margin-top: 6px; }
          .zx-footer { display: flex; flex-direction: column; gap: 14px; }
          .zx-energy-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #e4e4e7; margin-bottom: 6px; }
          .zx-bar-bg { width: 100%; height: 10px; background: #18181b; border-radius: 999px; overflow: hidden; border: 1px solid #27272a; }
          .zx-bar-fill { height: 100%; background: linear-gradient(90deg, #06b6d4, #facc15); border-radius: 999px; transition: width 0.15s ease; }
          .zx-upgrade-btn {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #18181b 0%, #0f172a 100%);
            border: 1px solid rgba(34, 211, 238, 0.35);
            border-radius: 16px;
            padding: 14px 16px;
            color: #ffffff;
            cursor: pointer;
          }
          .zx-upgrade-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .zx-upgrade-cost {
            background: rgba(250, 204, 21, 0.15);
            border: 1px solid rgba(250, 204, 21, 0.4);
            color: #facc15;
            padding: 6px 12px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 13px;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
