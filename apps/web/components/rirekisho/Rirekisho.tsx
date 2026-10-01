import React from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Cv } from "@rireki/shared";
import { COUNTRY_JA } from "@/lib/ui";

const SITUATION_JA = { job_hunting: "就職活動中", in_training: "研修中", employed: "在職中", offer: "内定" } as const;
const HIDDEN = <span className="hidden-note">送出機関の設定により非表示（連絡先は送出機関へ）</span>;

/** "2024-03" → ["2024", "3"] */
const ym = (s?: string): [string, string] => (s ? [s.slice(0, 4), String(Number(s.slice(5, 7)))] : ["", ""]);
/** "2002-03-15" → "2002年3月15日" */
export const dateJa = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
};
/** Full years between dob and asOf. */
export function ageAt(dob: string, asOf: Date) {
  const [y, m, d] = dob.split("-").map(Number);
  let age = asOf.getFullYear() - y;
  if (asOf.getMonth() + 1 < m || (asOf.getMonth() + 1 === m && asOf.getDate() < d)) age--;
  return age;
}

function Row({ date, text, kind }: { date?: string; text: ReactNode; kind?: string }) {
  const [y, m] = ym(date);
  return (
    <tr>
      <td className="c">{y}</td>
      <td className="c">{m}</td>
      {kind === undefined ? <td colSpan={2}>{text}</td> : <><td>{text}</td><td className="c">{kind}</td></>}
    </tr>
  );
}

function LangScale({ value, label, note }: { value: number; label: string; note: string }) {
  return (
    <>
      <div className="lang-scale" style={{ "--v": value } as CSSProperties}>
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className="tick" style={{ left: `${i * 10}%` }}>{i}</span>
        ))}
        <span className="track"></span>
        <span className="mark"></span>
      </div>
      <div className="lang-note"><b>{label}（当社評価）{value} / 10</b>　{note}</div>
    </>
  );
}

type Props = {
  cv: Cv; // the Json body validated by CvSchema (packages/shared/src/cv.ts)
  /** date printed as 「現在」 and used for the age (the candidate's updatedAt) */
  asOf: Date;
  photoUrl?: string;
  /** viewer links with the contact section switched off */
  hideContact?: boolean;
};

/** The company's Japanese 履歴書 render (always Japanese, whatever the UI language). Same component for detail, viewer and print. */
export function Rirekisho({ cv, asOf, photoUrl, hideContact = false }: Props) {
  const asOfIso = asOf.toISOString().slice(0, 10);
  const contact = (value?: string) => (hideContact ? HIDDEN : value);
  const unit = (v: number | undefined, u: string) => (v === undefined ? "—" : `${v} ${u}`);
  return (
    <article className="rirekisho" lang="ja">
      <div className="doc-title">
        <h2>履歴書</h2>
        <span className="date">{dateJa(asOfIso)}現在</span>
      </div>
      <table>
        <tbody>
          <tr>
            <th>家族構成</th>
            <td>{cv.familyCount !== undefined && `家族：${cv.familyCount}人`}{cv.familyDetail && `（${cv.familyDetail}）`}</td>
            <th>状況</th>
            <td>{SITUATION_JA[cv.situation]}</td>
          </tr>
        </tbody>
      </table>
      <table className="head">
        <tbody>
          <tr>
            <th>フリガナ</th>
            <td colSpan={3} className="kana-row">{cv.nameKana}</td>
            <td rowSpan={6} className="photo-cell">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- presigned URL, plain <img> as in the print route
                <img src={photoUrl} alt="" style={{ width: 80, height: 104, objectFit: "cover" }} />
              ) : (
                <span className="avatar-photo" style={{ width: "80px", height: "104px" }}>写真</span>
              )}
            </td>
          </tr>
          <tr>
            <th>氏名</th>
            <td colSpan={3} className="name-cell">{cv.nameLatin}</td>
          </tr>
          <tr>
            <th>生年月日</th>
            <td>{dateJa(cv.dob)}</td>
            <td className="c">{ageAt(cv.dob, asOf)}歳</td>
            <td>性別　{cv.gender === "male" ? "男" : "女"}</td>
          </tr>
          <tr>
            <th>国籍</th>
            <td>{COUNTRY_JA[cv.nationality]}</td>
            <th>携帯電話番号</th>
            <td>{contact(cv.mobile)}</td>
          </tr>
          <tr>
            <th>メール</th>
            <td colSpan={3}>{contact(cv.email)}</td>
          </tr>
          <tr>
            <th>フリガナ</th>
            <td colSpan={3} className="kana-row">{cv.addressKana}</td>
          </tr>
          <tr>
            <th>現住所</th>
            <td colSpan={4}>{contact(cv.address)}</td>
          </tr>
        </tbody>
      </table>
      <div className="sec">学歴</div>
      <table className="list">
        <tbody>
          <tr><th>年</th><th>月</th><th style={{ width: "auto", textAlign: "left" }}>学歴</th><th>入学・卒業</th></tr>
          {cv.education.map((e, i) => (
            <React.Fragment key={i}>
              <Row date={e.from} text={e.school} kind="入学" />
              {e.to && <Row date={e.to} text={e.school} kind="卒業" />}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="sec">職歴（アルバイト含む）</div>
      <table className="list">
        <tbody>
          <tr><th>年</th><th>月</th><th style={{ width: "auto", textAlign: "left" }}>職歴</th><th>入社・退職</th></tr>
          {cv.work.map((w, i) => (
            <React.Fragment key={i}>
              <Row date={w.from} text={w.employer} kind="入社" />
              {w.to && <Row date={w.to} text={w.employer} kind="退職" />}
              {w.jobDesc && (
                <tr>
                  <td className="c"></td>
                  <td className="c"></td>
                  <td colSpan={2} className="job-desc">仕事内容：{w.jobDesc}</td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {cv.currentStatus && (
        <table>
          <tbody>
            <tr><th>現在</th><td>{cv.currentStatus}</td></tr>
          </tbody>
        </table>
      )}
      <div className="sec">免許・資格</div>
      <table className="list">
        <tbody>
          <tr><th>年</th><th>月</th><th style={{ width: "auto", textAlign: "left" }} colSpan={2}>免許・資格</th></tr>
          {cv.licenses.map((l, i) => (
            <Row key={i} date={l.date} text={l.issuer ? `${l.name}（${l.issuer}）` : l.name} />
          ))}
        </tbody>
      </table>
      <div className="sec">語学力（母国語除く）</div>
      <table className="langs">
        <tbody>
          <tr>
            <th>日本語</th>
            <td><LangScale value={cv.jaLevel ?? 0} label="日本語会話レベル" note="※日本人同士の会話を10とした場合に、日本語会話能力がどの程度のレベルに達しているのかを10段階で評価したものです。" /></td>
          </tr>
          <tr>
            <th>英語</th>
            <td><LangScale value={cv.enLevel ?? 0} label="英語会話レベル" note="※英語話者同士の会話を10とした場合の10段階評価です。" /></td>
          </tr>
        </tbody>
      </table>
      <div className="sec">趣味・特技</div>
      <div className="para">{cv.hobbies}</div>
      <div className="sec">日本での就職志望動機、自己PR</div>
      <div className="para">{cv.motivationPr}</div>
      <table>
        <tbody>
          <tr><th>配偶者</th><td>{cv.spouse ? "有" : "無"}</td><th>配偶者の扶養義務</th><td>{cv.spouseDependency ? "有" : "無"}</td></tr>
        </tbody>
      </table>
      <div className="sec">その他・本人希望</div>
      <table>
        <tbody>
          <tr><th>給与</th><td>{cv.wishSalary}</td></tr>
          <tr><th>勤務地</th><td>{cv.wishLocation}</td></tr>
          <tr><th>勤務時間</th><td>{cv.wishHours}</td></tr>
        </tbody>
      </table>
      <div className="sec">身体情報</div>
      <table>
        <tbody>
          <tr><th>身長</th><td>{unit(cv.heightCm, "cm")}</td><th>体重</th><td>{unit(cv.weightKg, "kg")}</td></tr>
          <tr><th>服のサイズ</th><td>{cv.clothingSize ?? "—"}</td><th>肩（上半身）</th><td>{unit(cv.shoulderCm, "cm")}</td></tr>
          <tr><th>ウエスト（下半身）</th><td>{unit(cv.waistCm, "cm")}</td><th>靴のサイズ</th><td>{unit(cv.shoeCm, "cm")}</td></tr>
        </tbody>
      </table>
      <table>
        <tbody>
          <tr><th>宗教的に注意が必要な事項</th><td>{cv.religionNotes || "—"}</td></tr>
          <tr><th>食べられないもの</th><td>{cv.foodRestrictions || "—"}</td></tr>
          <tr><th>アレルギー</th><td>{cv.allergies || "—"}</td></tr>
          <tr><th>その他連絡事項</th><td>{cv.otherNotes || "—"}</td></tr>
        </tbody>
      </table>
    </article>
  );
}
