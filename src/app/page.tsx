"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Tab = "mine" | "missions" | "top" | "wallet";

interface MissionItem {
  id: string;
  title: string;
  subtitle: string;
  reward: number;
  tag: string;
}

interface LeaderRow {
  telegram_id: string | number;
  username: string;
  coins: string | number;
}

const MISSIONS: MissionItem[] = [
  { id: "ad_watch_1", title: "📺 Vizionează Reclamă Sponsor", subtitle: "Recompensă după 5 secunde", reward: 1500, tag: "ADS" },
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
  const [saveStatus, setSaveStatus] = useState<string>("Sincronizat");

  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loadingTop, setLoadingTop] = useState<boolean>(false);

  const pendingCoins = useRef<number>(0);
  const latestEnergy = useRef<number>(1000);
  const latestMultitap = useRef<number>(1);
  const latestUserId = useRef<number>(6905117764);
  const latestUserName = useRef<string>("Grigore");

  useEffect(() => {
    latestEnergy.current = energy;
  }, [energy]);

  useEffect(() => {
    latestMultitap.current = multitap;
  }, [multitap]);

  useEffect(() => {
    latestUserId.current = userId;
    latestUserName.current = userName;
  }, [userId, userName]);

  const flushToServer = useCallback(async (extraCoins = 0, overrideMultitap?: number, useKeepalive = false) => {
    const uid = latestUserId.current;
    const uname = latestUserName.current;
    const addAmt = pendingCoins.current + extraCoins;
    const activeLvl = overrideMultitap ?? latestMultitap.current;
    const activeEnergy = latestEnergy.current;

    if (!uid) return;
    if (addAmt === 0 && overrideMultitap === undefined) return;

    pendingCoins.current = 0;
    setSaveStatus("Salvare...");

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: useKeepalive,
        body: JSON.stringify({
          telegramId: uid,
          username: uname,
          coinsToAdd: addAmt,
          energy: activeEnergy,
          multitap: activeLvl,
        }),
      });
      if (res.ok && !useKeepalive) {
        const data = await res.json();
        if (data.user) {
          setCoins(Number(data.user.coins));
          setEnergy(Number(data.user.energy));
          setMaxEnergy(Number(data.user.max_energy));
          setMultitap(Number(data.user.multitap));
          latestMultitap.current = Number(data.user.multitap);
          setSaveStatus("Salvat ✓");
        }
      }
    } catch {
      if (addAmt > 0) {
        pendingCoins.current += addAmt;
      }
      setSaveStatus("Reîncerc...");
    }
  }, []);

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
    latestUserId.current = activeId;
    latestUserName.current = activeName;

    const savedClaims = localStorage.getItem(`zx_claims_${activeId}`);
    if (savedClaims) {
      try {
        setClaimed(JSON.parse(savedClaims));
      } catch {}
    }

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: activeId,
        username: activeName,
        coinsToAdd: 0,
        energy: 1000,
        multitap: 1,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const dbCoins = Number(data.user.coins) || 0;
          const dbEnergy = Number(data.user.energy) ?? 1000;
          const dbMaxEnergy = Number(data.user.max_energy) || 1000;
          const dbMultitap = Number(data.user.multitap) || 1;
          setCoins(dbCoins);
          setEnergy(dbEnergy);
          setMaxEnergy(dbMaxEnergy);
          setMultitap(dbMultitap);
          latestEnergy.current = dbEnergy;
          latestMultitap.current = dbMultitap;
          setSaveStatus("Salvat ✓");
        }
      })
      .catch(() => setSaveStatus("Offline"));
  }, []);

  useEffect(() => {
    if (activeTab !== "top") return;
    setLoadingTop(true);
    fetch(`/api/leaderboard?telegramId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.top)) setLeaderboard(data.top);
        if (data.myRank !== undefined) setMyRank(data.myRank);
      })
      .catch(() => {})
      .finally(() => setLoadingTop(false));
  }, [activeTab, userId]);

  useEffect(() => {
    const regen = setInterval(() => {
      setEnergy((prev) => {
        const next = prev < maxEnergy ? Math.min(maxEnergy, prev + 2) : prev;
        latestEnergy.current = next;
        return next;
      });
    }, 1000);

    const syncLoop = setInterval(() => {
      if (pendingCoins.current > 0) {
        void flushToServer(0);
      }
    }, 1500);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flushToServer(0, undefined, true);
      }
    };

    const handlePageHide = () => {
      void flushToServer(0, undefined, true);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(regen);
      clearInterval(syncLoop);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [maxEnergy, flushToServer]);

  const handleTap = () => {
    if (energy < multitap) return;
    setCoins((c) => c + multitap);
    setEnergy((e) => {
      const next = Math.max(0, e - multitap);
      latestEnergy.current = next;
      return next;
    });
    pendingCoins.current += multitap;
    setSaveStatus("Nesalvat...");
  };

  const upgradeCost = multitap * 250;

  const handleUpgrade = async () => {
    if (coins < upgradeCost) return;
    const nextLevel = multitap + 1;
    setCoins((c) => Math.max(0, c - upgradeCost));
    setMultitap(nextLevel);
    latestMultitap.current = nextLevel;
    await flushToServer(-upgradeCost, nextLevel);
  };

  const handleMissionClaim = async (m: MissionItem) => {
    if (m.id === "ad_watch_1") {
      if (adTimer > 0) return;

      let timerStarted = false;
      const startRewardTimer = () => {
        if (timerStarted) return;
        timerStarted = true;

        setAdTimer(5);
        const timer = setInterval(() => {
          setAdTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setCoins((c) => c + m.reward);
              void flushToServer(m.reward);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      };

      startRewardTimer();

      const Adsgram = (window as unknown as {
        Adsgram?: {
          init: (config: { blockId: number }) => {
            show: () => Promise<unknown>;
          };
        };
      }).Adsgram;

      if (!Adsgram) {
        startRewardTimer();
        return;
      }

      try {
        void Adsgram.init({ blockId: 12345 })
          .show()
          .catch(() => startRewardTimer());
      } catch {
        startRewardTimer();
      }
      return;
    }

    if (claimed.includes(m.id)) return;
    const updated = [...claimed, m.id];
    setClaimed(updated);
    localStorage.setItem(`zx_claims_${userId}`, JSON.stringify(updated));
    setCoins((c) => c + m.reward);
    await flushToServer(m.reward);
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
      <header className="zx-header">
        <div>
          <div className="zx-brand">ZENITH XECUTION • {saveStatus}</div>
          <div className="zx-user">{userName}</div>
        </div>
        <div className="zx-badge">Lvl {multitap} • {coins.toLocaleString()} ZX</div>
      </header>

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

        {activeTab === "top" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="zx-card" style={{ borderColor: "rgba(250, 204, 21, 0.45)" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Poziția ta în clasament</div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#facc15" }}>
                  {myRank ? `#${myRank}` : "Se calculează..."} • {userName}
                </div>
              </div>
              <button type="button" onClick={handleCopyInvite} className="zx-btn-cyan">
                {copied ? "✓ Copiat" : "👥 Invită (+5k)"}
              </button>
            </div>

            <div style={{ fontSize: "13px", fontWeight: 700, color: "#e4e4e7", marginTop: "2px" }}>
              🏆 Top 20 Jucători ZX Tap
            </div>

            {loadingTop ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", padding: "16px 0" }}>
                Se încarcă clasamentul...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {leaderboard.map((row, idx) => {
                  const isMe = Number(row.telegram_id) === userId;
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                  return (
                    <div
                      key={String(row.telegram_id)}
                      className="zx-card"
                      style={{
                        padding: "9px 12px",
                        borderColor: isMe ? "#22d3ee" : "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 800, color: idx < 3 ? "#facc15" : "#94a3b8", minWidth: "26px" }}>
                          {medal}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "13px", color: isMe ? "#22d3ee" : "#ffffff" }}>
                          {row.username || "Player"} {isMe ? "(Tu)" : ""}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "12px", color: "#facc15" }}>
                        {Number(row.coins).toLocaleString()} ZX
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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

      <nav className="zx-nav">
        <button type="button" onClick={() => setActiveTab("mine")} className={`zx-nav-item ${activeTab === "mine" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span>Mine</span>
        </button>
        <button type="button" onClick={() => setActiveTab("missions")} className={`zx-nav-item ${activeTab === "missions" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>🎯</span>
          <span>Misiuni</span>
        </button>
        <button type="button" onClick={() => setActiveTab("top")} className={`zx-nav-item ${activeTab === "top" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>🏆</span>
          <span>Top</span>
        </button>
        <button type="button" onClick={() => setActiveTab("wallet")} className={`zx-nav-item ${activeTab === "wallet" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>💎</span>
          <span>Wallet</span>
        </button>
      </nav>
    </main>
  );
}