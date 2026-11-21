"use client";

import { useEffect, useState, useRef } from "react";

type Tab = "mine" | "missions" | "friends" | "wallet";

interface MissionItem {
  id: string;
  title: string;
  subtitle: string;
  reward: number;
  tag: string;
}

const MISSIONS: MissionItem[] = [
  { id: "ad_watch_1", title: "📺 Vizionează Reclamă Sponsor", subtitle: "Recompensă instantă (Adsgram / Monetag)", reward: 1500, tag: "ADS" },
  { id: "daily_checkin", title: "🎁 Bonus Zilnic de Conectare", subtitle: "Intră zilnic pentru puncte suplimentare", reward: 2000, tag: "DAILY" },
  { id: "tg_channel", title: "📢 Abonează-te la Canalul ZX", subtitle: "Urmărește anunțurile oficiale Zenith Xecution", reward: 5000, tag: "SOCIAL" },
  { id: "share_story", title: "⚡ Distribuie ZX Tap prietenilor", subtitle: "Trimite link-ul de invitație pe Telegram", reward: 3000, tag: "TASK" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [userId, setUserId] = useState<number>(6905117764);
  const [userName, setUserName] = useState<string>("Grigore");
  const [coins, setCoins] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(1000);
  const [maxEnergy, setMaxEnergy] = useState<number>(1000);
  const [multitap, setMultitap] = useState<number>(1);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [adTimer, setAdTimer] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const pendingTaps = useRef<number>(0);

  useEffect(() => {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          ready: () => void;
          expand: () => void;
          initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } };
        };
      };
    }).Telegram?.WebApp;

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

    const savedClaims = localStorage.getItem(`zx_claims_${activeId}`);
    if (savedClaims) {
      try {
        setClaimed(JSON.parse(savedClaims));
      } catch {}
    }

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

  const handleMissionClaim = (m: MissionItem) => {
    if (m.id === "ad_watch_1") {
      if (adTimer > 0) return;
      setAdTimer(5);
      const timer = setInterval(() => {
        setAdTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCoins((c) => c + m.reward);
            pendingTaps.current += Math.ceil(m.reward / multitap);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    if (claimed.includes(m.id)) return;
    const updated = [...claimed, m.id];
    setClaimed(updated);
    localStorage.setItem(`zx_claims_${userId}`, JSON.stringify(updated));
    setCoins((c) => c + m.reward);
    pendingTaps.current += Math.ceil(m.reward / multitap);
  };

  const inviteLink = `https://t.me/zxtap_official_bot?start=ref_${userId}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const energyPercent = Math.min(100, Math.round((energy / maxEnergy) * 100));

  return (
    <main className="zx-container">
      {/* Header fix sus */}
      <header className="zx-header">
        <div>
          <div className="zx-brand">ZENITH XECUTION</div>
          <div className="zx-user">{userName}</div>
        </div>
        <div className="zx-badge">Lvl {multitap} • {coins.toLocaleString()} ZX</div>
      </header>

      {/* Zona centrală în funcție de tab */}
      <div className="zx-main">
        {activeTab === "mine" && (
          <>
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

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                className="zx-card"
                style={{ cursor: coins < upgradeCost ? "not-allowed" : "pointer", opacity: coins < upgradeCost ? 0.55 : 1 }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>⬆ Upgrade Multitap (+1)</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                    Putere actuală: +{multitap} / tap
                  </div>
                </div>
                <span className="zx-btn-pill">{upgradeCost.toLocaleString()} ZX</span>
              </button>
            </div>
          </>
        )}

        {activeTab === "missions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>🎯 Misiuni & Reclame</div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Vizionează reclame sau finalizează sarcini pentru puncte ZX</div>
            </div>

            {MISSIONS.map((m) => {
              const isDone = claimed.includes(m.id);
              const isAdRunning = m.id === "ad_watch_1" && adTimer > 0;
              return (
                <div key={m.id} className="zx-card">
                  <div style={{ paddingRight: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#22d3ee", fontWeight: 700, letterSpacing: "0.08em" }}>
                      {m.tag} • +{m.reward.toLocaleString()} ZX
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "2px" }}>{m.title}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{m.subtitle}</div>
                  </div>
                  <button
                    type="button"
                    disabled={isDone || isAdRunning}
                    onClick={() => handleMissionClaim(m)}
                    className={m.id === "ad_watch_1" ? "zx-btn-cyan" : "zx-btn-pill"}
                  >
                    {isAdRunning ? `Reclamă (${adTimer}s)` : isDone ? "✓ Primit" : m.id === "ad_watch_1" ? "▶ Watch" : "Claim"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "friends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>👥 Invită Prieteni</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                Primești +5,000 ZX pentru fiecare prieten care intră pe link-ul tău
              </div>
            </div>

            <div className="zx-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Link-ul tău de invitație:</div>
              <div style={{ background: "#09090b", padding: "10px", borderRadius: "10px", fontSize: "11px", color: "#22d3ee", wordBreak: "break-all", border: "1px solid #27272a" }}>
                {inviteLink}
              </div>
              <button type="button" onClick={handleCopyInvite} className="zx-btn-cyan" style={{ width: "100%", padding: "10px" }}>
                {copied ? "✓ Link copiat!" : "📋 Copiază link-ul de invitație"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", gap: "14px", padding: "0 12px" }}>
            <div style={{ width: "74px", height: "74px", borderRadius: "50%", background: "rgba(34, 211, 238, 0.12)", border: "2px solid rgba(34, 211, 238, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
              💎
            </div>
            <span className="zx-soon-tag">COMING SOON</span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}>TON Wallet & Airdrop</div>
            <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
              Conectarea portofelului TON (Tonkeeper / Telegram Wallet) și conversia punctelor <b>ZX</b> vor fi disponibile în curând. Continuă să minezi!
            </div>
            <div className="zx-card" style={{ justifyContent: "center", opacity: 0.7 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#22d3ee" }}>🔒 Connect TON Wallet — Soon</span>
            </div>
          </div>
        )}
      </div>

      {/* Bara de navigare jos */}
      <nav className="zx-nav">
        <button type="button" onClick={() => setActiveTab("mine")} className={`zx-nav-item ${activeTab === "mine" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span>Mine</span>
        </button>
        <button type="button" onClick={() => setActiveTab("missions")} className={`zx-nav-item ${activeTab === "missions" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>🎯</span>
          <span>Misiuni</span>
        </button>
        <button type="button" onClick={() => setActiveTab("friends")} className={`zx-nav-item ${activeTab === "friends" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>👥</span>
          <span>Prieteni</span>
        </button>
        <button type="button" onClick={() => setActiveTab("wallet")} className={`zx-nav-item ${activeTab === "wallet" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>💎</span>
          <span>Wallet</span>
        </button>
      </nav>
    </main>
  );
}
