"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { YOUTUBE_CHANNEL_URL } from "./youtube";

type Tab = "mine" | "missions" | "friends" | "top" | "wallet";

interface MissionItem {
  id: string;
  title: string;
  subtitle: string;
  reward: number;
  tag: string;
}

interface AdsgramResult {
  done: boolean;
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
  { id: "daily_checkin", title: "🎁 Daily Check-in Bonus", subtitle: "Log in daily to earn bonus ZX points", reward: 2000, tag: "DAILY" },
  { id: "tg_channel", title: "📢 Join Official ZX Channel", subtitle: "Follow official Zenith Xecution announcements", reward: 5000, tag: "SOCIAL" },
  { id: "share_story", title: "⚡ Share ZX-Tap with Friends", subtitle: "Send your invite link on Telegram", reward: 3000, tag: "TASK" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [userId, setUserId] = useState<number>(6905117764);
  const [userName, setUserName] = useState<string>("Player");
  const [coins, setCoins] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(1000);
  const [maxEnergy, setMaxEnergy] = useState<number>(1000);
  const [multitap, setMultitap] = useState<number>(1);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [adInProgress, setAdInProgress] = useState<boolean>(false);
  const [dailyAdCount, setDailyAdCount] = useState<number>(0);
  const [adStatus, setAdStatus] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("Synced");

  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loadingTop, setLoadingTop] = useState<boolean>(false);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralEarnings, setReferralEarnings] = useState<number>(0);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
  const [referrerId, setReferrerId] = useState<number | null>(null);
  const [youtubeStatus, setYoutubeStatus] = useState<string>("idle");

  const pendingCoins = useRef<number>(0);
  const latestEnergy = useRef<number>(1000);
  const latestMultitap = useRef<number>(1);
  const latestUserId = useRef<number>(6905117764);
  const latestUserName = useRef<string>("Player");
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
    setSaveStatus("Saving...");

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
          setSaveStatus("Saved ✓");
        }
      }
    } catch {
      if (addAmt > 0) {
        pendingCoins.current += addAmt;
      }
      setSaveStatus("Retrying...");
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
    let activeName = "Player";
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
          setSaveStatus("Saved ✓");
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
    if (activeTab !== "friends" && activeTab !== "wallet") return;
    if (activeTab === "friends") setLoadingFriends(true);
    fetch(`/api/sync?telegramId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
        setReferralCount(Number(data.referralCount) || 0);
        setReferralEarnings(Number(data.referralEarnings) || 0);
      })
      .catch(() => {})
      .finally(() => {
        if (activeTab === "friends") setLoadingFriends(false);
      });
  }, [activeTab, userId]);

  useEffect(() => {
    if (activeTab !== "missions") return;
    let active = true;
    const checkVerification = () => {
      fetch(`/api/youtube/status?telegramId=${userId}`)
        .then((response) => {
          if (!response.ok) throw new Error("Unable to load YouTube verification status.");
          return response.json();
        })
        .then((data: { verified: boolean; configured: boolean; status?: string }) => {
          if (active) {
            setYoutubeStatus(data.configured ? (data.status ?? (data.verified ? "verified" : "idle")) : "setup_required");
          }
        })
        .catch(() => {
          if (active) setYoutubeStatus("error");
        });
    };

    checkVerification();
    window.addEventListener("focus", checkVerification);
    return () => {
      active = false;
      window.removeEventListener("focus", checkVerification);
    };
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
    setSaveStatus("Unsaved...");
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
          show: () => Promise<AdsgramResult>;
        };
      };
    }).Adsgram;

    if (!Adsgram) {
      setAdStatus("Ads are unavailable right now. Please try again later.");
      return;
    }

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
      setAdStatus("Daily reward limit reached. Come back tomorrow.");
      return;
    }

    adInProgressRef.current = true;
    setAdInProgress(true);
    setAdStatus("");

    try {
      const result = await Adsgram.init({ blockId: "62058" }).show();
      if (!result.done) {
        setAdStatus("Ad not completed. No ZX reward was added.");
        return;
      }

      const completedDate = getLocalDateKey();
      const completedCount = readDailyAdCount(userId, completedDate) + 1;
      dailyAdDateRef.current = completedDate;
      dailyAdCountRef.current = completedCount;
      setDailyAdCount(completedCount);
      setCoins((c) => c + AD_REWARD);
      let savedDailyCount = true;
      try {
        localStorage.setItem(`zx_rewarded_ads_${userId}_${completedDate}`, String(completedCount));
      } catch {
        savedDailyCount = false;
      }
      await flushToServer(AD_REWARD);
      setAdStatus(
        savedDailyCount
          ? `Ad completed. +${AD_REWARD.toLocaleString()} ZX added.`
          : "Reward added, but this device could not save the daily ad count.",
      );
    } catch {
      setAdStatus("The ad could not be completed. No ZX reward was added.");
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
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Join ZX-Tap and mine ZX with me!")}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  const openExternalLink = (url: string) => {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          openLink?: (link: string) => void;
        };
      };
    }).Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleYouTubeVerify = () => {
    setYoutubeStatus("checking");
    const authorizationUrl = `${window.location.origin}/api/youtube/authorize?telegramId=${userId}`;
    openExternalLink(authorizationUrl);
  };

  const energyPercent = Math.min(100, Math.round((energy / maxEnergy) * 100));
  const youtubeStatusMessage: Record<string, string> = {
    idle: "Subscribe to the channel, then verify your subscription.",
    checking: "Checking subscription status...",
    verified: "Subscription verified for ZX-Earn_Officil.",
    not_subscribed: "We couldn't find an active subscription. Subscribe first, then verify.",
    setup_required: "YouTube verification needs Google OAuth setup on the server.",
    error: "Verification could not be completed. Please try again.",
  };

  return (
    <main className="zx-container">
      <header className="zx-header">
        <div className="zx-brand-group">
          <span className="zx-brand-icon" aria-hidden="true">ZX</span>
          <div className="zx-header-copy">
            <div className="zx-brand">
              ZENITH XECUTION
              <span className="zx-save-status">{saveStatus}</span>
            </div>
            <div className="zx-user">{userName}</div>
          </div>
        </div>
        <div className="zx-badge">LV {multitap} · {coins.toLocaleString()} ZX</div>
      </header>

      <div className="zx-main">
        {activeTab === "mine" && (
          <>
            <section className="zx-balance-box">
              <div className="zx-balance-label">ZX Balance</div>
              <div className="zx-balance-value">{coins.toLocaleString()}</div>
            </section>

            <section className="zx-coin-wrap">
              <button type="button" onClick={handleTap} className="zx-coin" aria-label="Tap to mine ZX">
                <span className="zx-coin-title">ZX</span>
                <span className="zx-coin-sub">TAP TO MINE</span>
              </button>
            </section>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div className="zx-energy-row">
                  <span>⚡ Energy</span>
                  <span>{energy} / {maxEnergy}</span>
                </div>
                <div
                  className="zx-bar-bg"
                  role="progressbar"
                  aria-label="Energy"
                  aria-valuemin={0}
                  aria-valuemax={maxEnergy}
                  aria-valuenow={energy}
                >
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
                    Current power: +{multitap} / tap
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
              className="zx-card zx-ad-card"
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
                  Complete an ad to earn +{AD_REWARD.toLocaleString()} ZX
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
              <div className="zx-ad-feedback" role="status" aria-live="polite">
                {adStatus || (dailyAdCount >= AD_DAILY_LIMIT
                  ? "Daily reward limit reached. Come back tomorrow."
                  : "Your reward is added only after the ad is completed.")}
              </div>
            </div>

            <div className="zx-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }}>
                  YOUTUBE SUBSCRIPTION
                </div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "3px" }}>
                  Subscribe to ZX-Earn_Officil
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Subscribe to the official channel and verify it with your Google account.
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => openExternalLink(YOUTUBE_CHANNEL_URL)}
                  className="zx-btn-pill"
                  style={{ flex: 1 }}
                >
                  Subscribe
                </button>
                <button
                  type="button"
                  onClick={handleYouTubeVerify}
                  disabled={youtubeStatus === "checking"}
                  className="zx-btn-cyan"
                  style={{ flex: 1 }}
                >
                  Verify
                </button>
              </div>
              <div
                role="status"
                aria-live="polite"
                style={{
                  fontSize: "11px",
                  color: youtubeStatus === "verified" ? "#22d3ee" : "#94a3b8",
                }}
              >
                {youtubeStatusMessage[youtubeStatus] ?? youtubeStatusMessage.idle}
              </div>
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
                    {isDone ? "✓ Claimed" : "Claim"}
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
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Earn 10% of the ZX points mined by your invited friends</div>
            </div>

            <div className="zx-card" style={{ gap: "10px" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Invited</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#22d3ee" }}>{referralCount}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Total Referral ZX</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#facc15" }}>{referralEarnings.toLocaleString()} ZX</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button type="button" onClick={handleCopyInvite} className="zx-btn-cyan">
                {copied ? "✓ Link copied" : "📋 Copy Link"}
              </button>
              <button type="button" onClick={handleShareInvite} className="zx-btn-pill">
                ↗️ Share
              </button>
            </div>

            {loadingFriends ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", padding: "16px 0" }}>
                Loading referrals...
              </div>
            ) : referrals.length === 0 ? (
              <div className="zx-card" style={{ justifyContent: "center", color: "#94a3b8", fontSize: "12px" }}>
                No invited friends yet
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
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Your Leaderboard Rank</div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#facc15" }}>
                  {myRank ? `#${myRank}` : "Calculating..."} • {userName}
                </div>
              </div>
            </div>

            <div style={{ fontSize: "13px", fontWeight: 700, color: "#e4e4e7", marginTop: "2px" }}>
              🏆 Top 20 ZX-Tap Players
            </div>

            {loadingTop ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", padding: "16px 0" }}>
                Loading leaderboard...
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
                          {row.username || "Player"} {isMe ? "(You)" : ""}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "8px" }}>
            <div style={{ textAlign: "center", marginBottom: "2px" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>Rewards &amp; Balance Overview</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>Your current ZX balance and earning activity</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="zx-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>ZX Balance</span>
                <strong style={{ fontSize: "18px", color: "#22d3ee" }}>{coins.toLocaleString()} ZX</strong>
              </div>
              <div className="zx-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Current Level</span>
                <strong style={{ fontSize: "18px", color: "#ffffff" }}>{multitap}</strong>
              </div>
              <div className="zx-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Mining Power</span>
                <strong style={{ fontSize: "18px", color: "#22d3ee" }}>+{multitap} ZX / tap</strong>
              </div>
              <div className="zx-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Referrals Earned</span>
                <strong style={{ fontSize: "18px", color: "#facc15" }}>{referralEarnings.toLocaleString()} ZX</strong>
              </div>
            </div>

            <section className="zx-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>How ZX Points Are Earned &amp; Tracked</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                <strong style={{ color: "#e4e4e7" }}>Mining:</strong> Earn {multitap} ZX per tap. Tap earnings sync to your account.
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                <strong style={{ color: "#e4e4e7" }}>Rewarded ads:</strong> Earn +1,000 ZX per completed ad, up to 20 per local calendar day.
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                <strong style={{ color: "#e4e4e7" }}>Missions:</strong> Claim available mission rewards. Claims are saved on this device and added to your synced balance.
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                <strong style={{ color: "#e4e4e7" }}>Referrals:</strong> Earn 10% of invited friends&apos; mined ZX. Referral commissions are tracked separately.
              </div>
            </section>
          </div>
        )}
      </div>

      <nav className="zx-nav" aria-label="Main navigation">
        <button type="button" onClick={() => setActiveTab("mine")} aria-current={activeTab === "mine" ? "page" : undefined} className={`zx-nav-item ${activeTab === "mine" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span>Mine</span>
        </button>
        <button type="button" onClick={() => setActiveTab("missions")} aria-current={activeTab === "missions" ? "page" : undefined} className={`zx-nav-item ${activeTab === "missions" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>🎯</span>
          <span>Missions</span>
        </button>
        <button type="button" onClick={() => setActiveTab("friends")} aria-current={activeTab === "friends" ? "page" : undefined} className={`zx-nav-item ${activeTab === "friends" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>👥</span>
          <span>Friends</span>
        </button>
        <button type="button" onClick={() => setActiveTab("top")} aria-current={activeTab === "top" ? "page" : undefined} className={`zx-nav-item ${activeTab === "top" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>🏆</span>
          <span>Top</span>
        </button>
        <button type="button" onClick={() => setActiveTab("wallet")} aria-current={activeTab === "wallet" ? "page" : undefined} className={`zx-nav-item ${activeTab === "wallet" ? "active" : ""}`}>
          <span style={{ fontSize: "16px" }}>💎</span>
          <span>Wallet</span>
        </button>
      </nav>
    </main>
  );
}