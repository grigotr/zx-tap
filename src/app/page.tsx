"use client";

import { useEffect, useState, useRef } from "react";
import { Zap, Trophy, Cpu, ArrowUpCircle } from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy") => void;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

export default function ZXTapApp() {
  const [userId, setUserId] = useState<number>(100001);
  const [userName, setUserName] = useState<string>("Operator ZX");
  const [coins, setCoins] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(1000);
  const [maxEnergy] = useState<number>(1000);
  const [multitap, setMultitap] = useState<number>(1);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; val: number }[]>([]);

  const pendingCoinsRef = useRef<number>(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    let activeId = 100001;
    let activeName = "Operator ZX";

    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        activeId = tg.initDataUnsafe.user.id;
        activeName = tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || "Operator ZX";
      }
    }

    setUserId(activeId);
    setUserName(activeName);

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: activeId, username: activeName, coinsToAdd: 0 }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCoins(Number(data.user.coins));
          setEnergy(Number(data.user.energy));
          setMultitap(Number(data.user.multitap));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy((prev) => (prev < maxEnergy ? Math.min(maxEnergy, prev + 3) : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [maxEnergy]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (pendingCoinsRef.current > 0) {
        const toSend = pendingCoinsRef.current;
        pendingCoinsRef.current = 0;

        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramId: userId,
            username: userName,
            coinsToAdd: toSend,
            energy,
            multitap,
          }),
        }).catch(() => {
          pendingCoinsRef.current += toSend;
        });
      }
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [userId, userName, energy, multitap]);

  const handleTap = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (energy < multitap) return;

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");

    setCoins((prev) => prev + multitap);
    setEnergy((prev) => Math.max(0, prev - multitap));
    pendingCoinsRef.current += multitap;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();

    setFloatingTexts((prev) => [...prev, { id, x, y, val: multitap }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 700);
  };

  const upgradeCost = multitap * 250;

  const handleUpgrade = () => {
    if (coins < upgradeCost) return;
    setCoins((prev) => prev - upgradeCost);
    setMultitap((prev) => prev + 1);
    pendingCoinsRef.current -= upgradeCost;
  };

  return (
    <main className="min-h-screen flex flex-col justify-between p-5 max-w-md mx-auto bg-gradient-to-b from-[#09090b] via-[#0d1117] to-[#09090b]">
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu size={18} />
          </div>
          <div>
            <p className="text-xs text-zinc-400">ZENITH XECUTION</p>
            <h1 className="text-sm font-semibold text-zinc-100">{userName}</h1>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium flex items-center gap-1.5">
          <Trophy size={13} />
          <span>Lvl {multitap}</span>
        </div>
      </header>

      <section className="text-center my-4">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Sold ZX Token</p>
        <div className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-zinc-100 to-amber-300">
          {coins.toLocaleString("ro-RO")}
        </div>
      </section>

      <section className="flex items-center justify-center my-2">
        <button
          onPointerDown={handleTap}
          className="relative w-64 h-64 rounded-full bg-gradient-to-b from-zinc-900 to-black border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.18)] active:scale-95 transition-transform duration-75 flex flex-col items-center justify-center group"
        >
          <div className="w-52 h-52 rounded-full border border-amber-400/20 flex flex-col items-center justify-center bg-[#09090b]/80">
            <span className="text-4xl font-black tracking-wider text-cyan-400 group-hover:text-cyan-300">
              ZX
            </span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 mt-1">
              TAP TO MINE
            </span>
          </div>

          {floatingTexts.map((ft) => (
            <span
              key={ft.id}
              style={{ left: ft.x, top: ft.y }}
              className="pointer-events-none absolute text-2xl font-bold text-amber-400 animate-bounce"
            >
              +{ft.val}
            </span>
          ))}
        </button>
      </section>

      <footer className="space-y-4 pb-2">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-cyan-400 font-medium">
              <Zap size={14} /> Energie
            </span>
            <span className="text-zinc-400">
              {energy} / {maxEnergy}
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-150"
              style={{ width: `${(energy / maxEnergy) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={coins < upgradeCost}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2.5 text-left">
            <ArrowUpCircle className="text-amber-400" size={20} />
            <div>
              <p className="text-sm font-medium text-zinc-100">Upgrade Multitap (+1)</p>
              <p className="text-xs text-zinc-400">Putere actuală: +{multitap} / tap</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {upgradeCost} ZX
          </span>
        </button>
      </footer>
    </main>
  );
}
