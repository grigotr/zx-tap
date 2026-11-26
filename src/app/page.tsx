"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Tab = "mine" | "missions" | "friends" | "top" | "wallet";

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

interface ReferralRow {
  telegram_id: string | number;
  username: string;
  earned: string | number;
}

const AD_REWARD = 1000;
const AD_DAILY_LIMIT = 20;

const getLocalDateKey = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const readDailyAdCount = (userId: number, date: string) => {
  const count = Number(localStorage.getItem(`zx_rewarded_ads_${userId}_${date}`));
  return Number.isInteger(count) && count > 0 ? Math.min(count, AD_DAILY_LIMIT) : 0;
};

const MISSIONS: MissionItem[] = [
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
  const [adInProgress, setAdInProgress] = useState<boolean>(false);
  const [dailyAdCount, setDailyAdCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("Sincronizat");

  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loadingTop, setLoadingTop] = useState<boolean>(false);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralEarnings, setReferralEarnings] = useState<number>(0);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
  const [referrerId, setReferrerId] = useState<number | null>(null);

  const pendingCoins = useRef<number>(0);
  const latestEnergy = useRef<number>(1000);
  const latestMultitap = useRef<number>(1);
  const latestUserId = useRef<number>(6905117764);
  const latestUserName = useRef<string>("Grigore");
  const latestReferrerId = useRef<number | null>(null);
  const dailyAdCountRef = useRef<number>(0);
  const dailyAdDateRef = useRef<string>("");
  const adInProgressRef = useRef<boolean>(false);

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

  useEffect(() => {
    latestReferrerId.current = referrerId;
  }, [referrerId]);

  const flushToServer = useCallback(async (extraCoins = 0, overrideMultitap?: number, useKeepalive = false) => {
    const uid = latestUserId.current;
    const uname = latestUserName.current;
    const referrer = latestReferrerId.current;
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
          referrerId: referrer,
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
          initDataUnsafe?: {
            user?: { id: number; first_name?: string; username?: string };
            start_param?: string;
          };
        };
      };
    }).Telegram?.WebApp;

    let activeId = 6905117764;
    let activeName = "Grigore";
    let activeReferrerId: number | null = null;

    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        activeId = tg.initDataUnsafe.user.id;
        activeName = tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || "Player";
      }
      const startParam = tg.initDataUnsafe?.start_param;
      if (startParam?.startsWith("ref_")) {
        const parsedReferrerId = Number(startParam.slice(4));
        if (Number.isInteger(parsedReferrerId) && parsedReferrerId > 0 && parsedReferrerId !== activeId) {
          activeReferrerId = parsedReferrerId;
        }
      }
    }

    setUserId(activeId);
    setUserName(activeName);
    latestUserId.current = activeId;
    latestUserName.current = activeName;
    const adDate = getLocalDateKey();
    const savedAdCount = readDailyAdCount(activeId, adDate);
    dailyAdDateRef.current = adDate;
    dailyAdCountRef.current = savedAdCount;
    setDailyAdCount(savedAdCount);

    const savedClaims = localStorage.getItem(`zx_claims_${activeId}`);
    if (savedClaims) {
      try {
        setClaimed(JSON.parse(savedClaims));
      } catch {}
    }

    const savedReferrer = localStorage.getItem(`zx_referrer_${activeId}`);
    if (!savedReferrer && activeReferrerId) {
      // The referrer is persisted locally and also retained once by the server.
      localStorage.setItem(`zx_referrer_${activeId}`, String(activeReferrerId));
    }
    const referrerId = savedReferrer ? Number(savedReferrer) : activeReferrerId;
    setReferrerId(referrerId);
    latestReferrerId.current = referrerId;

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: activeId,
        username: activeName,
        coinsToAdd: 0,
        energy: 1000,
        multitap: 1,
        referrerId,
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
    const refreshDailyAdCount = () => {
      const currentDate = getLocalDateKey();
      if (dailyAdDateRef.current === currentDate) return;

      const count = readDailyAdCount(latestUserId.current, currentDate);
      dailyAdDateRef.current = currentDate;
      dailyAdCountRef.current = count;
      setDailyAdCount(count);
    };

    const interval = setInterval(refreshDailyAdCount, 30_000);
    window.addEventListener("focus", refreshDailyAdCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshDailyAdCount);
    };
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
    if (activeTab !== "friends") return;
    setLoadingFriends(true);
    fetch(`/api/sync?telegramId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
        setReferralCount(Number(data.referralCount) || 0);
        setReferralEarnings(Number(data.referralEarnings) || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingFriends(false));
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

  const handleRewardedAd = async () => {
    if (adInProgressRef.current) return;

    const Adsgram = (window as unknown as {
      Adsgram?: {
        init: (config: { blockId: string }) => {
          show: () => Promise<unknown>;
        };
      };
    }).Adsgram;

    if (!Adsgram) return;

    const userId = latestUserId.current;
    const currentDate = getLocalDateKey();
    const storedCount = readDailyAdCount(userId, currentDate);
    const currentCount = dailyAdDateRef.current === currentDate
      ? Math.max(dailyAdCountRef.current, storedCount)
      : storedCount;

    dailyAdDateRef.current = currentDate;
    dailyAdCountRef.current = currentCount;
    if (currentCount >= AD_DAILY_LIMIT) {
      setDailyAdCount(currentCount);
      return;
    }

    const nextCount = currentCount + 1;
    dailyAdCountRef.current = nextCount;
    setDailyAdCount(nextCount);
    localStorage.setItem(`zx_rewarded_ads_${userId}_${currentDate}`, String(nextCount));
    adInProgressRef.current = true;
    setAdInProgress(true);

    try {
      await Adsgram.init({ blockId: "62058" }).show();
      setCoins((c) => c + AD_REWARD);
      await flushToServer(AD_REWARD);
    } catch {
      // Do not award the reward if the ad does not complete.
    } finally {
      adInProgressRef.current = false;
      setAdInProgress(false);
    }
  };

  const handleMissionClaim = async (m: MissionItem) => {
    if (claimed.includes(m.id)) return;
    const updated = [...claimed, m.id];
    setClaimed(updated);
    localStorage.setItem(`zx_claims_${userId}`, JSON.stringify(updated));
    setCoins((c) => c + m.reward);
    await flushToServer(m.reward);
  };

  const inviteLink = `https://t.me/zxtap_official_bot/app?startapp=ref_${userId}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = () => {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          openTelegramLink?: (url: string) => void;
        };
      };
    }).Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Alătură-te ZX-Tap și mina ZX împreună cu mine!")}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
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
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>Missions &amp; Ads</div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Complete tasks and watch rewarded ads to earn ZX</div>
            </div>

            <div
              className="zx-card"
              style={{
                gap: "10px",
                padding: "10px 12px",
                background: "rgba(24, 24, 27, 0.88)",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ minWidth: 0, paddingRight: "4px" }}>
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.04em" }}>
                  ADS • +{AD_REWARD.toLocaleString()} ZX • {dailyAdCount}/{AD_DAILY_LIMIT} today
                </div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "3px" }}>Watch Rewarded Ad</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Watch a short video ad to earn +1,000 ZX
                </div>
              </div>
              <button
                type="button"
                disabled={adInProgress || dailyAdCount >= AD_DAILY_LIMIT}
                onClick={handleRewardedAd}
                className="zx-btn-cyan"
              >
                {adInProgress ? "Loading..." : dailyAdCount >= AD_DAILY_LIMIT ? "Limit Reached" : "Watch Ad"}
              </button>
            </div>

            {MISSIONS.map((m) => {
              const isDone = claimed.includes(m.id);
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
                    disabled={isDone}
                    onClick={() => handleMissionClaim(m)}
                    className="zx-btn-pill"
                  >
                    {isDone ? "✓ Primit" : "Claim"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "friends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>👥 Friends & Referrals</div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Primești 10% din monedele câștigate de invitații tăi</div>
            </div>

            <div className="zx-card" style={{ gap: "10px" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Invitați</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#22d3ee" }}>{referralCount}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Total comision ZX</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#facc15" }}>{referralEarnings.toLocaleString()} ZX</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button type="button" onClick={handleCopyInvite} className="zx-btn-cyan">
                {copied ? "✓ Link copiat" : "📋 Copy Link"}
              </button>
              <button type="button" onClick={handleShareInvite} className="zx-btn-pill">
                ↗️ Share
              </button>
            </div>

            {loadingFriends ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", padding: "16px 0" }}>
                Se încarcă invitații...
              </div>
            ) : referrals.length === 0 ? (
              <div className="zx-card" style={{ justifyContent: "center", color: "#94a3b8", fontSize: "12px" }}>
                Nu ai invitați încă
              </div>
            ) : (
              referrals.map((referral) => (
                <div key={String(referral.telegram_id)} className="zx-card" style={{ padding: "9px 12px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>
                    {referral.username || "Player"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "12px", color: "#facc15" }}>
                    +{Number(referral.earned).toLocaleString()} ZX
                  </div>
                </div>
              ))
            )}
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
          <span>Missions</span>
        </button>
        <button type="button" onClick={() => setActiveTab("friends")} className={`zx-nav-item ${activeTab === "friends" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>👥</span>
          <span>Friends</span>
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