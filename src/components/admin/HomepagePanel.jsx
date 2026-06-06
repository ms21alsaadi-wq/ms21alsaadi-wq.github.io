import { Control } from "./AdminUi.jsx";

export default function HomepagePanel({
  draftSettings,
  openSection,
  selectedThemeSection,
  setOpenSection,
  themeSections,
  updateDraft,
  uploadSettingImage,
}) {
  return (
    <section className="homepage-admin-page">
      <div className="homepage-sections-list">
        {(selectedThemeSection ? [selectedThemeSection] : themeSections).map(
          (section) => (
            <div key={section.id} className="homepage-section-row">
              <div
                className="section-header"
                onClick={() =>
                  setOpenSection(openSection === section.id ? null : section.id)
                }
              >
                <div>
                  <span>{section.label}</span>
                  <small>
                    {draftSettings[section.titleKey] || "اضغط للتعديل"}
                  </small>
                </div>
                <b>{openSection === section.id ? "−" : "+"}</b>
              </div>

              {(openSection === section.id ||
                selectedThemeSection?.id === section.id) && (
                <div
                  className={`section-form section-form-pro ${section.headerExtra ? "header-admin-clean-form" : ""} ${section.heroExtra ? "hero-admin-compact-form" : ""}`}
                >
                  <Control label="العنوان">
                    <input
                      value={draftSettings[section.titleKey] || ""}
                      onChange={(e) =>
                        updateDraft(section.titleKey, e.target.value)
                      }
                      placeholder="عنوان القسم"
                    />
                  </Control>

                  {section.headerExtra && (
                    <>
                      <Control label="اللغة">
                        <select
                          value={draftSettings.homeHeaderLang || "AR"}
                          onChange={(e) =>
                            updateDraft("homeHeaderLang", e.target.value)
                          }
                        >
                          <option value="AR">AR</option>
                          <option value="EN">EN</option>
                        </select>
                      </Control>

                      <div className="header-sticky-wrapper">
                        <span className="header-sticky-label">
                          تثبيت الهيدر
                        </span>
                        <label
                          className="header-sticky-inline-control"
                          aria-label="تثبيت الهيدر"
                        >
                          <input
                            type="checkbox"
                            checked={draftSettings.homeHeaderSticky !== false}
                            onChange={(e) =>
                              updateDraft(
                                "homeHeaderSticky",
                                e.target.checked,
                              )
                            }
                          />
                          <span>تثبيت الهيدر</span>
                        </label>
                      </div>
                    </>
                  )}

                  {!section.pagesExtra && !section.headerExtra && (
                    <Control label="الوصف">
                      <textarea
                        value={draftSettings[section.descKey] || ""}
                        onChange={(e) =>
                          updateDraft(section.descKey, e.target.value)
                        }
                        placeholder="وصف القسم"
                      />
                    </Control>
                  )}

                  {section.heroExtra && (
                    <>
                      <div className="hero-admin-options-grid">
                        <Control label="شكل الهيرو">
                          <select
                            value={draftSettings.homeHeroLayout || "split"}
                            onChange={(e) =>
                              updateDraft("homeHeroLayout", e.target.value)
                            }
                          >
                            <option value="video">فيديو بعرض الصفحة</option>
                            <option value="banner">بنر صورة بعرض الصفحة</option>
                            <option value="split">
                              مقسم: بنر + صورة + نص
                            </option>
                          </select>
                        </Control>

                        <Control label="نص الزر">
                          <input
                            value={draftSettings.homeHeroButton || ""}
                            onChange={(e) =>
                              updateDraft("homeHeroButton", e.target.value)
                            }
                            placeholder="تسوق الآن"
                          />
                        </Control>

                        <Control label="رابط زر الهيرو">
                          <input
                            value={
                              draftSettings.homeHeroButtonLink || "#products"
                            }
                            onChange={(e) =>
                              updateDraft(
                                "homeHeroButtonLink",
                                e.target.value,
                              )
                            }
                            placeholder="#products أو /page/offers"
                          />
                        </Control>

                        {draftSettings.homeHeroLayout === "split" && (
                          <Control label="مكان الصورة الأمامية">
                            <select
                              value={
                                draftSettings.homeHeroImagePosition || "left"
                              }
                              onChange={(e) =>
                                updateDraft(
                                  "homeHeroImagePosition",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="left">يسار</option>
                              <option value="right">يمين</option>
                            </select>
                          </Control>
                        )}
                      </div>

                      {draftSettings.homeHeroLayout === "video" && (
                        <div className="hero-admin-options-grid">
                          <Control label="رابط فيديو الهيرو">
                            <input
                              value={draftSettings.homeHeroVideo || ""}
                              onChange={(e) =>
                                updateDraft("homeHeroVideo", e.target.value)
                              }
                              placeholder="رابط MP4 أو رابط Google Drive"
                            />
                            <small className="hero-upload-note">
                              يدعم Google Drive كرابط معاينة. للتشغيل الصامت
                              التلقائي الأفضل استخدم رابط MP4 مباشر مثل
                              Cloudinary.
                            </small>
                          </Control>

                          <Control label="أو ارفع فيديو">
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/*"
                              onChange={(e) =>
                                uploadSettingImage(
                                  "homeHeroVideo",
                                  e.target.files[0],
                                )
                              }
                            />
                            <small className="hero-upload-note">
                              الرفع المباشر محدود بـ 750KB فقط. للأفضل استخدم
                              رابط فيديو خارجي.
                            </small>
                          </Control>
                        </div>
                      )}

                      {draftSettings.homeHeroLayout === "split" && (
                        <div className="hero-admin-bg-tools">
                          <Control label="رابط بنر الخلفية">
                            <input
                              value={draftSettings.homeHeroBgImage || ""}
                              onChange={(e) =>
                                updateDraft("homeHeroBgImage", e.target.value)
                              }
                              placeholder="https://..."
                            />
                          </Control>

                          <Control label="أو ارفع بنر الخلفية">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                uploadSettingImage(
                                  "homeHeroBgImage",
                                  e.target.files[0],
                                )
                              }
                            />
                          </Control>
                        </div>
                      )}
                    </>
                  )}

                  {!section.heroExtra && section.buttonKey && (
                    <Control label="نص الزر">
                      <input
                        value={draftSettings[section.buttonKey] || ""}
                        onChange={(e) =>
                          updateDraft(section.buttonKey, e.target.value)
                        }
                        placeholder="تسوق الآن"
                      />
                    </Control>
                  )}

                  {section.imageKey &&
                    !(
                      section.heroExtra &&
                      draftSettings.homeHeroLayout === "video"
                    ) && (
                      <div
                        className={`section-image-tools ${section.heroExtra ? "hero-admin-image-tools" : ""}`}
                      >
                        <Control label="رابط الصورة">
                          <input
                            value={draftSettings[section.imageKey] || ""}
                            onChange={(e) =>
                              updateDraft(section.imageKey, e.target.value)
                            }
                            placeholder="https://..."
                          />
                        </Control>

                        <Control label="أو ارفع صورة">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              uploadSettingImage(
                                section.imageKey,
                                e.target.files[0],
                              )
                            }
                          />
                        </Control>
                      </div>
                    )}

                  {section.headerExtra && (
                    <div className="header-extra-tools">
                      <Control label="لون خلفية الهيدر">
                        <input
                          type="color"
                          value={draftSettings.homeHeaderBg || "#F5F1E8"}
                          onChange={(e) =>
                            updateDraft("homeHeaderBg", e.target.value)
                          }
                        />
                      </Control>
                      <Control label="الشريط العلوي">
                        <input
                          value={draftSettings.homeHeaderTopBar || ""}
                          onChange={(e) =>
                            updateDraft("homeHeaderTopBar", e.target.value)
                          }
                          placeholder="شحن سريع داخل السعودية 🚚"
                        />
                      </Control>
                      <Control label="لون الشريط العلوي">
                        <input
                          type="color"
                          value={draftSettings.homeTopBarBg || "#0F3D2E"}
                          onChange={(e) =>
                            updateDraft("homeTopBarBg", e.target.value)
                          }
                        />
                      </Control>
                      <Control label="لون نص الشريط">
                        <input
                          type="color"
                          value={draftSettings.homeTopBarText || "#FFFFFF"}
                          onChange={(e) =>
                            updateDraft("homeTopBarText", e.target.value)
                          }
                        />
                      </Control>
                      <div className="topbar-toggle-wrapper">
                        <span className="topbar-toggle-label">
                          إظهار الشريط
                        </span>
                        <label
                          className="topbar-toggle-control"
                          aria-label="إظهار الشريط العلوي"
                        >
                          <input
                            type="checkbox"
                            checked={draftSettings.homeTopBarEnabled !== false}
                            onChange={(e) =>
                              updateDraft(
                                "homeTopBarEnabled",
                                e.target.checked,
                              )
                            }
                          />
                          <span>إظهار الشريط</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {section.pagesExtra && (
                    <div className="pages-admin-tools">
                      <div className="pages-admin-list">
                        {(draftSettings.homePages || []).map(
                          (page, pageIndex) => (
                            <div className="page-row-editor" key={pageIndex}>
                              <label className="page-visible-toggle">
                                <input
                                  type="checkbox"
                                  checked={page.visible !== false}
                                  onChange={(e) => {
                                    const next = [
                                      ...(draftSettings.homePages || []),
                                    ];
                                    next[pageIndex] = {
                                      ...next[pageIndex],
                                      visible: e.target.checked,
                                    };
                                    updateDraft("homePages", next);
                                  }}
                                />
                                <span>
                                  {page.visible === false ? "مخفي" : "ظاهر"}
                                </span>
                              </label>

                              <input
                                value={page.label || ""}
                                onChange={(e) => {
                                  const next = [
                                    ...(draftSettings.homePages || []),
                                  ];
                                  next[pageIndex] = {
                                    ...next[pageIndex],
                                    label: e.target.value,
                                    visible:
                                      next[pageIndex]?.visible !== false,
                                  };
                                  updateDraft("homePages", next);
                                }}
                                placeholder="اسم الصفحة"
                              />
                              <input
                                value={page.href || ""}
                                onChange={(e) => {
                                  const next = [
                                    ...(draftSettings.homePages || []),
                                  ];
                                  next[pageIndex] = {
                                    ...next[pageIndex],
                                    href: e.target.value,
                                    visible:
                                      next[pageIndex]?.visible !== false,
                                  };
                                  updateDraft("homePages", next);
                                }}
                                placeholder="/page/products"
                              />
                              <button
                                type="button"
                                className="admin-secondary"
                                onClick={() => {
                                  const next = [
                                    ...(draftSettings.homePages || []),
                                  ];
                                  next.splice(pageIndex, 1);
                                  updateDraft("homePages", next);
                                }}
                              >
                                حذف
                              </button>
                            </div>
                          ),
                        )}
                      </div>

                      <button
                        type="button"
                        className="admin-primary add-page-btn"
                        onClick={() =>
                          updateDraft("homePages", [
                            ...(draftSettings.homePages || []),
                            {
                              label: "صفحة جديدة",
                              href: "/page/new-page",
                              visible: true,
                            },
                          ])
                        }
                      >
                        إضافة صفحة
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
