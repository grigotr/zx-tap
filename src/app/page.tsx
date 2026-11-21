"use client";

import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [userId, setUserId] = useState<number>(6905117764);
  const [userName, setUserName] = useState<string>("Grigore");
  const [coins, setCoins] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(1000);
  const [maxEnergy, setMaxEnergy] = useState<number>(1000);
  const [multitap, setMultitap] = useState<number>(1);
  const pendingTaps = useRef<number>(0);

  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void; initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } } } } }).Telegram?.WebApp;
    let activeId = 6905117764;
    let activeName = "Grigore";

    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        activeId = tg.initDataUnsafe.user.id;
        activeName = tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || "Player";
      }
    }

    setUserId(activeId);
    setUserName(activeName);

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id: activeId, username: activeName, taps: 0 }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setCoins(Number(data.user.coins));
          setEnergy(Number(data.user.energy));
          setMaxEnergy(Number(data.user.max_energy));
          setMultitap(Number(data.user.multitap));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const regen = setInterval(() => {
      setEnergy((prev) => (prev < maxEnergy ? Math.min(maxEnergy, prev + 2) : prev));
    }, 1000);

    const syncLoop = setInterval(() => {
      if (pendingTaps.current > 0) {
        const tapsToSend = pendingTaps.current;
        pendingTaps.current = 0;
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegram_id: userId, username: userName, taps: tapsToSend }),
        }).catch(() => {});
      }
    }, 2500);

    return () => {
      clearInterval(regen);
      clearInterval(syncLoop);
    };
  }, [maxEnergy, userId, userName]);

  const handleTap = () => {
    if (energy < multitap) return;
    setCoins((c) => c + multitap);
    setEnergy((e) => Math.max(0, e - multitap));
    pendingTaps.current += 1;
  };

  const upgradeCost = multitap * 250;

  const handleUpgrade = async () => {
    if (coins < upgradeCost) return;
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id: userId, username: userName, taps: 0, upgrade: "multitap" }),
    });
    const data = await res.json();
    if (data.user) {
      setCoins(Number(data.user.coins));
      setMultitap(Number(data.user.multitap));
    }
  };

  const energyPercent = Math.min(100, Math.round((energy / maxEnergy) * 100));

  return (
    <main className="zx-container">
      <header className="zx-header">
        <div>
          <div className="zx-brand">ZENITH XECUTION</div>
          <div className="zx-user">{userName}</div>
        </div>
        <div className="zx-badge">Lvl {multitap}</div>
      </header>

      <section className="zx-balance-box">
        <div className="zx-balance-label">Sold ZX Token</div>
        <div className="zx-balance-value">{coins.toLocaleString()}</div>
      </section>

      <section className="zx-coin-wrap">
        <button type="button" onClick={handleTap} className="zx-coin">
          <span className="zx-coin-title">ZX</span>
          <span className="zx-coin-sub">TAP TO MINE</span>
        </button>
      </section>

      <footer className="zx-footer">
        <div>
          <div className="zx-energy-row">
            <span>⚡ Energie</span>
            <span>{energy} / {maxEnergy}</span>
          </div>
          <div className="zx-bar-bg">
            <div className="zx-bar-fill" style={{ width: `${energyPercent}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpgrade}
          disabled={coins < upgradeCost}
          className="zx-upgrade-btn"
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>⬆ Upgrade Multitap (+1)</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
              Putere actuală: +{multitap} / tap
            </div>
          </div>
          <div className="zx-upgrade-cost">{upgradeCost.toLocaleString()} ZX</div>
        </button>
      </footer>
    </main>
  );
}
