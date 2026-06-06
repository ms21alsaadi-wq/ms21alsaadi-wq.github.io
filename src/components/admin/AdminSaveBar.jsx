export default function AdminSaveBar({
  resetDraftSettings,
  saveDraftSettings,
  t,
}) {
  return (
    <div className="admin-save-bar">
      <div>
        <b>{t("unsaved")}</b>
        <span>{t("unsavedDesc")}</span>
      </div>
      <div className="save-bar-actions">
        <button className="admin-secondary" onClick={resetDraftSettings}>
          {t("cancelChanges")}
        </button>
        <button className="admin-primary" onClick={saveDraftSettings}>
          {t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
