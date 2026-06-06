import { palettes } from "../../data/storeData.js";
import { Control } from "./AdminUi.jsx";

export default function IdentityPanel({
  draftSettings,
  setDraftSettings,
  t,
  updateDraft,
  uploadSettingImage,
}) {
  return (
    <section className="admin-grid">
      <div className="admin-card">
        <h2>{t("readyColors")}</h2>
        <div className="palette-grid">
          {palettes.map((p) => (
            <button
              key={p.name}
              onClick={() => setDraftSettings((s) => ({ ...s, ...p }))}
            >
              <span>{p.name}</span>
              <i style={{ background: p.primaryColor }} />
              <i style={{ background: p.accentColor }} />
              <i style={{ background: p.backgroundColor }} />
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h2>{t("editIdentity")}</h2>
        <Control label="اسم المتجر">
          <input
            value={draftSettings.storeName}
            onChange={(e) => updateDraft("storeName", e.target.value)}
          />
        </Control>
        <Control label="الوصف القصير">
          <input
            value={draftSettings.tagline}
            onChange={(e) => updateDraft("tagline", e.target.value)}
          />
        </Control>
        <Control label="الخط">
          <select
            value={draftSettings.fontFamily}
            onChange={(e) => updateDraft("fontFamily", e.target.value)}
          >
            <option>Cairo</option>
            <option>Tajawal</option>
          </select>
        </Control>
        <Control label="اللون الأساسي">
          <input
            type="color"
            value={draftSettings.primaryColor}
            onChange={(e) => updateDraft("primaryColor", e.target.value)}
          />
        </Control>
        <Control label="لون اللمسة">
          <input
            type="color"
            value={draftSettings.accentColor}
            onChange={(e) => updateDraft("accentColor", e.target.value)}
          />
        </Control>
        <Control label="لون الخلفية">
          <input
            type="color"
            value={draftSettings.backgroundColor}
            onChange={(e) => updateDraft("backgroundColor", e.target.value)}
          />
        </Control>
      </div>

      <div className="admin-card">
        <h2>{t("logo")}</h2>
        <Control label="رابط الشعار">
          <input
            value={draftSettings.logo}
            onChange={(e) => updateDraft("logo", e.target.value)}
          />
        </Control>
        <Control label="أو ارفع الشعار">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => uploadSettingImage("logo", e.target.files[0])}
          />
        </Control>
        <p className="admin-help-text">{t("logoHint")}</p>
        {draftSettings.logo && (
          <img
            className="admin-image-preview small"
            src={draftSettings.logo}
            alt="معاينة الشعار"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    </section>
  );
}
