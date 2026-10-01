import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";

const DEMO_LINK = "/s/8fK2mQx"; // TODO(share-viewer): point at the seeded demo share link

// public/landing.html — marketing page on the root domain. The hero art is a decorative mock of a client page (aria-hidden).
export default async function LandingPage() {
  const t = await getTranslations();
  return (
    <>
      <header className="site-header">
        <div className="container site-nav">
          <div className="brand" style={{ padding: "0" }}>
            <div className="brand-mark">履</div>
            <div>
              <div className="brand-name">Rireki</div>
            </div>
          </div>
          <nav className="links"><a href="#features">{t("landing.nav_features")}</a><a href="#security">{t("landing.nav_security")}</a></nav>
          <div className="spacer"></div>
          <LangSwitch />
          <ThemeToggle />
          <Link className="btn hide-mobile" href="/login">{t("landing.login")}</Link>
          <Link className="btn btn-primary" href="/signup">{t("landing.start")}</Link>
        </div>
      </header>
      <main>
        <section className="container hero">
          <div>
            <span className="eyebrow">{t("landing.eyebrow")}</span>
            <h1 className="mt-12">{t("landing.h1")}</h1>
            <p className="lead">{t("landing.lead")}</p>
            <div className="cta">
              <Link className="btn btn-primary btn-lg" href="/signup">{t("landing.cta_primary")}</Link>
              <Link className="btn btn-lg" href={DEMO_LINK}>{t("landing.cta_demo")}</Link>
            </div>
            <p className="small faint mt-16">{t("landing.cta_note")}</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="row between mb-8">
              <div className="row-nowrap">
                <span className="avatar avatar-sm" style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>SV</span><span className="mono small">saoviet.rireki.app</span>
              </div>
              <span className="badge badge-warning"><Icon name="eye" />View only</span>
            </div>
            <div className="cand-card" style={{ pointerEvents: "none" }}>
              <span className="avatar-photo lg">NA</span>
              <div className="grow">
                <div className="n">グエン・バン・アン</div>
                <div className="k">Nguyễn Văn An · SV000182</div>
                <div className="facts"><span>男 · 24歳 · 🇻🇳 ベトナム</span><span>溶接 · JLPT N4</span></div>
              </div>
            </div>
            <div className="row between mt-12 small">
              <span className="row-nowrap"><Icon name="lock" className="ic-sm muted" /><span>Password · expires 3 Oct</span></span>
              <span className="row-nowrap"><Icon name="eye" className="ic-sm muted" /><span>24 views · 3 viewers</span></span>
            </div>
            <BarChart values={[3, 6, 4, 6, 5]} labels={["26", "27", "28", "29", "30"]} compact unit="views" className="mt-12" />
          </div>
        </section>
        <section className="section container" id="features">
          <h2>{t("landing.f_title")}</h2>
          <p className="lead">{t("landing.f_lead")}</p>
          <div className="grid grid-3">
            {(
              [
                ["upload", "f1"],
                ["form", "f2"],
                ["video", "f3"],
                ["link", "f4"],
                ["shield", "f5"],
                ["activity", "f6"],
              ] as const
            ).map(([icon, key]) => (
              <div className="feature" key={key}>
                <div className="icon-box"><Icon name={icon} /></div>
                <h3>{t(`landing.${key}_t`)}</h3>
                <p>{t(`landing.${key}_d`)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="section container">
          <h2>{t("landing.how_title")}</h2>
          <div className="steps3">
            {(["how1", "how2", "how3"] as const).map((key) => (
              <div key={key}>
                <b>{t(`landing.${key}_t`)}</b>
                <p className="muted small mt-8">{t(`landing.${key}_d`)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="section container" id="security">
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div>
              <h2>{t("landing.sec_title")}</h2>
              <p className="lead">{t("landing.sec_lead")}</p>
              <ul className="stack" style={{ listStyle: "none", padding: "0", margin: "0", gap: "10px" }}>
                {(["sec1", "sec2", "sec3", "sec4"] as const).map((key) => (
                  <li className="row-nowrap" style={{ alignItems: "flex-start" }} key={key}>
                    <Icon name="check-circle" style={{ color: "var(--success)" }} /><span>{t(`landing.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <div className="card-header">
                <h3>{t("landing.langs_t")}</h3>
              </div>
              <div className="card-body stack">
                <p className="muted small">{t("landing.langs_d")}</p>
                <div className="lang-flags"><span>English</span><span>日本語</span><span>Tiếng Việt</span><span>မြန်မာ</span><span>Bahasa Indonesia</span></div>
                <p className="small muted">{t("landing.langs_note")}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container row between">
          <span>© 2026 Rireki · 履歴書クラウド</span>
          <span className="row" style={{ gap: "16px" }}><a href="#">{t("landing.terms")}</a><a href="#">{t("landing.privacy")}</a><a href="#">{t("landing.security_page")}</a></span>
        </div>
      </footer>
    </>
  );
}
