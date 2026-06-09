import { useEffect, useRef, useState } from "react";
import { makePageSlug } from "../../utils/helpers.js";
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
  const [footerEditor, setFooterEditor] = useState(null);
  const editorRef = useRef(null);
  const defaultFooterSections = [
    {
      title: "روابط المتجر",
      links: [
        { label: "الصفحة الرئيسية", href: "/" },
        { label: "المنتجات", href: "#products" },
        { label: "العروض", href: "/page/offers" },
      ],
    },
    {
      title: "خدمة العميل",
      links: [
        { label: "حسابي", href: "/account" },
        { label: "تصفح المنتجات", href: "#products" },
        { label: "تواصل واتساب", href: "whatsapp" },
      ],
    },
  ];
  const footerSections = Array.isArray(draftSettings.footerSections)
    ? draftSettings.footerSections
    : defaultFooterSections;
  const updateFooterSection = (sectionIndex, changes) => {
    const next = [...footerSections];
    next[sectionIndex] = { ...next[sectionIndex], ...changes };
    updateDraft("footerSections", next);
  };
  const updateFooterLink = (sectionIndex, linkIndex, changes) => {
    const next = [...footerSections];
    const currentSection = next[sectionIndex] || { title: "", links: [] };
    const links = [...(currentSection.links || [])];
    links[linkIndex] = { ...links[linkIndex], ...changes };
    next[sectionIndex] = { ...currentSection, links };
    updateDraft("footerSections", next);
  };
  const footerPageHref = (label) =>
    `/page/${makePageSlug(label || "footer-page")}`;
  const activeFooterLink =
    footerEditor &&
    footerSections[footerEditor.sectionIndex]?.links?.[footerEditor.linkIndex];

  useEffect(() => {
    if (!editorRef.current || !footerEditor) return;
    editorRef.current.innerHTML = activeFooterLink?.content || "";
  }, [footerEditor?.sectionIndex, footerEditor?.linkIndex]);

  const runEditorCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (footerEditor && editorRef.current) {
      updateFooterLink(footerEditor.sectionIndex, footerEditor.linkIndex, {
        content: editorRef.current.innerHTML,
      });
    }
  };

  const saveEditorContent = () => {
    if (!footerEditor || !editorRef.current) return;
    updateFooterLink(footerEditor.sectionIndex, footerEditor.linkIndex, {
      content: editorRef.current.innerHTML,
    });
  };
  const addEditorLink = () => {
    const url = window.prompt("اكتب رابط الصفحة أو الموقع");
    if (!url) return;
    runEditorCommand("createLink", url);
  };

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

                      <div className="header-switch-field">
                        <span className="header-switch-label">
                          تثبيت الهيدر
                        </span>
                        <label
                          className="header-switch-control"
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

                  {section.footerExtra && (
                    <div className="footer-admin-tools">
                      <div className="footer-admin-grid">
                        <Control label="الموقع">
                          <input
                            value={draftSettings.footerLocation || ""}
                            onChange={(e) =>
                              updateDraft("footerLocation", e.target.value)
                            }
                            placeholder="الرياض، السعودية"
                          />
                        </Control>
                        <Control label="نص الحقوق">
                          <input
                            value={draftSettings.footerCopyright || ""}
                            onChange={(e) =>
                              updateDraft("footerCopyright", e.target.value)
                            }
                            placeholder="يترك فارغاً لاستخدام اسم المتجر والسنة"
                          />
                        </Control>
                      </div>

                      <div className="footer-admin-sections">
                        {footerSections.map((footerSection, sectionIndex) => (
                          <div
                            className="footer-admin-section"
                            key={sectionIndex}
                          >
                            <div className="footer-admin-section-head">
                              <input
                                value={footerSection.title || ""}
                                onChange={(e) =>
                                  updateFooterSection(sectionIndex, {
                                    title: e.target.value,
                                  })
                                }
                                placeholder="عنوان القسم"
                              />
                              <button
                                type="button"
                                className="admin-secondary"
                                onClick={() => {
                                  const next = [...footerSections];
                                  next.splice(sectionIndex, 1);
                                  updateDraft("footerSections", next);
                                }}
                              >
                                حذف القسم
                              </button>
                            </div>

                            <div className="footer-admin-links">
                              {(footerSection.links || []).map(
                                (link, linkIndex) => (
                                  <div
                                    className="footer-admin-link-card"
                                    key={linkIndex}
                                  >
                                    <div className="footer-admin-link-row">
                                      <input
                                        value={link.label || ""}
                                        onChange={(e) =>
                                          updateFooterLink(
                                            sectionIndex,
                                            linkIndex,
                                            { label: e.target.value },
                                          )
                                        }
                                        placeholder="اسم الرابط"
                                      />
                                      <input
                                        value={link.href || ""}
                                        onChange={(e) =>
                                          updateFooterLink(
                                            sectionIndex,
                                            linkIndex,
                                            { href: e.target.value },
                                          )
                                        }
                                        placeholder="/page/about-us أو whatsapp"
                                      />
                                      <button
                                        type="button"
                                        className="admin-secondary"
                                        onClick={() =>
                                          updateFooterLink(
                                            sectionIndex,
                                            linkIndex,
                                            {
                                              href: footerPageHref(link.label),
                                            },
                                          )
                                        }
                                      >
                                        صفحة
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-secondary"
                                        onClick={() =>
                                          setFooterEditor({
                                            sectionIndex,
                                            linkIndex,
                                          })
                                        }
                                      >
                                        المحتوى
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-secondary"
                                        onClick={() => {
                                          const next = [...footerSections];
                                          const links = [
                                            ...(next[sectionIndex].links || []),
                                          ];
                                          links.splice(linkIndex, 1);
                                          next[sectionIndex] = {
                                            ...next[sectionIndex],
                                            links,
                                          };
                                          updateDraft("footerSections", next);
                                        }}
                                      >
                                        حذف
                                      </button>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>

                            <button
                              type="button"
                              className="admin-primary add-page-btn"
                              onClick={() => {
                                const next = [...footerSections];
                                next[sectionIndex] = {
                                  ...next[sectionIndex],
                                  links: [
                                    ...(next[sectionIndex].links || []),
                                    { label: "رابط جديد", href: "/" },
                                  ],
                                };
                                updateDraft("footerSections", next);
                              }}
                            >
                              إضافة رابط
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="admin-primary add-page-btn"
                        onClick={() =>
                          updateDraft("footerSections", [
                            ...footerSections,
                            {
                              title: "قسم جديد",
                              links: [{ label: "رابط جديد", href: "/" }],
                            },
                          ])
                        }
                      >
                        إضافة قسم في الفوتر
                      </button>
                    </div>
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
                      <div className="header-switch-field">
                        <span className="header-switch-label">
                          إظهار الشريط
                        </span>
                        <label
                          className="header-switch-control"
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

                      <div className="pages-admin-actions">
                        <label
                          className="pages-sticky-toggle"
                          aria-label="تثبيت شريط الصفحات"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(draftSettings.homePagesSticky)}
                            onChange={(e) =>
                              updateDraft("homePagesSticky", e.target.checked)
                            }
                          />
                          <span>تثبيت شريط الصفحات</span>
                        </label>

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
                    </div>
                  )}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {footerEditor && (
        <div className="footer-content-modal">
          <div
            className="footer-content-modal-bg"
            onClick={() => setFooterEditor(null)}
          />
          <section className="footer-content-modal-card">
            <div className="footer-content-modal-head">
              <div>
                <span>Footer Page Content</span>
                <h3>{activeFooterLink?.label || "محتوى الصفحة"}</h3>
              </div>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setFooterEditor(null)}
              >
                إغلاق
              </button>
            </div>

            <div className="footer-editor-toolbar">
              <button type="button" onClick={() => runEditorCommand("bold")}>
                B
              </button>
              <button type="button" onClick={() => runEditorCommand("italic")}>
                I
              </button>
              <button
                type="button"
                onClick={() => runEditorCommand("underline")}
              >
                U
              </button>
              <select
                defaultValue="p"
                onChange={(e) => {
                  if (e.target.value === "p") {
                    runEditorCommand("formatBlock", "P");
                  } else {
                    runEditorCommand("formatBlock", e.target.value);
                  }
                }}
              >
                <option value="p">نص</option>
                <option value="H2">عنوان كبير</option>
                <option value="H3">عنوان فرعي</option>
              </select>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  runEditorCommand("fontSize", e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">حجم الخط</option>
                <option value="2">صغير</option>
                <option value="3">عادي</option>
                <option value="5">كبير</option>
                <option value="7">كبير جداً</option>
              </select>
              <button
                type="button"
                onClick={() => runEditorCommand("insertUnorderedList")}
              >
                قائمة
              </button>
              <button
                type="button"
                onClick={() => runEditorCommand("insertOrderedList")}
              >
                أرقام
              </button>
              <button
                type="button"
                onClick={() => runEditorCommand("justifyRight")}
              >
                يمين
              </button>
              <button
                type="button"
                onClick={() => runEditorCommand("justifyCenter")}
              >
                وسط
              </button>
              <button
                type="button"
                onClick={() => runEditorCommand("justifyLeft")}
              >
                يسار
              </button>
              <button type="button" onClick={addEditorLink}>
                رابط
              </button>
              <button
                type="button"
                onClick={() => runEditorCommand("unlink")}
              >
                حذف الرابط
              </button>
              <label className="footer-editor-color">
                لون الخط
                <input
                  type="color"
                  defaultValue="#0f3d2e"
                  onChange={(e) =>
                    runEditorCommand("foreColor", e.target.value)
                  }
                />
              </label>
              <label className="footer-editor-color">
                تمييز
                <input
                  type="color"
                  defaultValue="#fff3bf"
                  onChange={(e) =>
                    runEditorCommand("hiliteColor", e.target.value)
                  }
                />
              </label>
            </div>

            <div
              ref={editorRef}
              className="footer-rich-editor"
              contentEditable
              dir="rtl"
              onInput={saveEditorContent}
              suppressContentEditableWarning
            />

            <div className="footer-content-modal-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={() => runEditorCommand("removeFormat")}
              >
                إزالة التنسيق
              </button>
              <button
                type="button"
                className="admin-primary"
                onClick={() => {
                  saveEditorContent();
                  setFooterEditor(null);
                }}
              >
                حفظ المحتوى
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
