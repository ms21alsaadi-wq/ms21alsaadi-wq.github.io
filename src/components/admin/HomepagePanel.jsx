import { useEffect, useRef, useState } from "react";
import { makePageSlug } from "../../utils/helpers.js";
import { fileToDataUrl } from "../../utils/media.js";
import { Control } from "./AdminUi.jsx";

export default function HomepagePanel({
  draftSettings,
  openSection,
  selectedThemeSection,
  setOpenSection,
  themeSections,
  updateDraft,
  uploadSettingImage,
  products = [],
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
  const featureIconOptions = [
    { value: "truck", label: "شاحنة" },
    { value: "shield", label: "درع" },
    { value: "rotate", label: "رجوع" },
    { value: "star", label: "نجمة" },
    { value: "heart", label: "قلب" },
    { value: "gift", label: "هدية" },
    { value: "card", label: "بطاقة" },
    { value: "support", label: "دعم" },
    { value: "sparkles", label: "تميز" },
  ];
  const featureFields = [
    {
      label: "البطاقة الأولى",
      iconKey: "homeFeatureOneIcon",
      titleKey: "homeFeatureOneTitle",
      textKey: "homeFeatureOneText",
      fallbackIcon: "truck",
    },
    {
      label: "البطاقة الثانية",
      iconKey: "homeFeatureTwoIcon",
      titleKey: "homeFeatureTwoTitle",
      textKey: "homeFeatureTwoText",
      fallbackIcon: "shield",
    },
    {
      label: "البطاقة الثالثة",
      iconKey: "homeFeatureThreeIcon",
      titleKey: "homeFeatureThreeTitle",
      textKey: "homeFeatureThreeText",
      fallbackIcon: "rotate",
    },
  ];
  const careProductIds = Array.isArray(draftSettings.homeCareProductIds)
    ? draftSettings.homeCareProductIds
    : [];
  const availableCareProducts = products.filter(
    (product) => (product.status || "active") !== "hidden",
  );
  const toggleCareProduct = (productId) => {
    const next = careProductIds.includes(productId)
      ? careProductIds.filter((id) => id !== productId)
      : [...careProductIds, productId];
    updateDraft("homeCareProductIds", next);
  };
  const defaultPlantCategories = [
    {
      title: "نباتات داخلية",
      href: "#products",
      imageSize: 100,
      image:
        "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "سهلة العناية",
      href: "#products",
      imageSize: 100,
      image:
        "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "أصص وإكسسوارات",
      href: "#products",
      imageSize: 100,
      image:
        "https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80",
    },
  ];
  const plantCategories = Array.isArray(draftSettings.homePlantCategories)
    ? draftSettings.homePlantCategories.slice(0, 10)
    : defaultPlantCategories;
  const updatePlantCategory = (index, changes) => {
    const next = [...plantCategories];
    next[index] = { ...next[index], ...changes };
    updateDraft("homePlantCategories", next);
  };
  const uploadPlantCategoryImage = async (index, file) => {
    if (!file) return;
    try {
      const image = await fileToDataUrl(file, {
        maxWidth: 760,
        maxHeight: 560,
        quality: 0.64,
        mimeType: "image/webp",
      });
      updatePlantCategory(index, { image });
    } catch (error) {
      console.error("Plant category image upload failed:", error);
      window.alert("تعذر رفع الصورة. جرّب صورة أصغر أو بصيغة مختلفة.");
    }
  };

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

                  {!section.pagesExtra &&
                    !section.headerExtra &&
                    !section.plantCategoriesExtra && (
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

                  {section.plantCategoriesExtra && (
                    <div className="plant-categories-admin-editor">
                      <div className="plant-categories-admin-head">
                        <strong>الأقسام</strong>
                        <span>{plantCategories.length} / 10</span>
                      </div>

                      {plantCategories.map((plantCategory, index) => (
                        <div
                          className="plant-category-admin-card"
                          key={index}
                        >
                          <Control label="اسم القسم">
                            <input
                              value={plantCategory.title || ""}
                              onChange={(e) =>
                                updatePlantCategory(index, {
                                  title: e.target.value,
                                })
                              }
                              placeholder="مثال: نباتات داخلية"
                            />
                          </Control>
                          <Control label="الرابط">
                            <input
                              value={plantCategory.href || ""}
                              onChange={(e) =>
                                updatePlantCategory(index, {
                                  href: e.target.value,
                                })
                              }
                              placeholder="#products أو /page/products"
                            />
                          </Control>
                          <Control label="رابط الصورة">
                            <input
                              value={plantCategory.image || ""}
                              onChange={(e) =>
                                updatePlantCategory(index, {
                                  image: e.target.value,
                                })
                              }
                              placeholder="https://..."
                            />
                          </Control>
                          <Control label="أو ارفع صورة">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                await uploadPlantCategoryImage(
                                  index,
                                  e.target.files?.[0],
                                );
                                e.target.value = "";
                              }}
                            />
                          </Control>
                          <Control
                            label={`حجم الصورة ${plantCategory.imageSize || 100}%`}
                          >
                            <input
                              type="range"
                              min="80"
                              max="140"
                              step="5"
                              value={plantCategory.imageSize || 100}
                              onChange={(e) =>
                                updatePlantCategory(index, {
                                  imageSize: Number(e.target.value),
                                })
                              }
                            />
                          </Control>
                          {plantCategory.image && (
                            <img
                              className="plant-category-admin-preview"
                              src={plantCategory.image}
                              alt={plantCategory.title || "قسم النباتات"}
                            />
                          )}
                          <button
                            type="button"
                            className="admin-secondary"
                            onClick={() => {
                              const next = [...plantCategories];
                              next.splice(index, 1);
                              updateDraft("homePlantCategories", next);
                            }}
                          >
                            حذف القسم
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="admin-primary add-page-btn"
                        disabled={plantCategories.length >= 10}
                        onClick={() =>
                          updateDraft("homePlantCategories", [
                            ...plantCategories,
                            {
                              title: "قسم جديد",
                              href: "#products",
                              imageSize: 100,
                              image:
                                "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80",
                            },
                          ])
                        }
                      >
                        إضافة قسم
                      </button>
                    </div>
                  )}

                  {section.careExtra && (
                    <div className="care-products-admin-editor">
                      <div className="plant-categories-admin-head">
                        <strong>منتجات شريط العناية</strong>
                        <span>{careProductIds.length} محدد</span>
                      </div>
                      <p className="admin-muted">
                        إذا ما اخترتي منتجات، سيظهر الشريط تلقائيًا من منتجات
                        المتجر النشطة.
                      </p>
                      <Control label="عنوان منتجات العناية">
                        <input
                          value={draftSettings.homeCareProductsTitle || ""}
                          onChange={(e) =>
                            updateDraft("homeCareProductsTitle", e.target.value)
                          }
                          placeholder="مثال: منتجات العناية"
                        />
                      </Control>
                      <div className="care-products-admin-list">
                        {availableCareProducts.length ? (
                          availableCareProducts.map((product) => (
                            <label
                              className="care-product-admin-row"
                              key={product.id}
                            >
                              <input
                                type="checkbox"
                                checked={careProductIds.includes(product.id)}
                                onChange={() => toggleCareProduct(product.id)}
                              />
                              {product.image ? (
                                <img src={product.image} alt={product.name} />
                              ) : (
                                <span />
                              )}
                              <b>{product.name || "منتج بدون اسم"}</b>
                            </label>
                          ))
                        ) : (
                          <p className="admin-muted">
                            أضيفي منتجات أولاً عشان تختاريها هنا.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {section.featuresExtra && (
                    <div className="features-admin-editor">
                      {featureFields.map((field) => (
                        <div className="feature-admin-card" key={field.titleKey}>
                          <h4>{field.label}</h4>
                          <Control label="الأيقونة">
                            <select
                              value={
                                draftSettings[field.iconKey] ||
                                field.fallbackIcon
                              }
                              onChange={(e) =>
                                updateDraft(field.iconKey, e.target.value)
                              }
                            >
                              {featureIconOptions.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Control>
                          <Control label="عنوان البطاقة">
                            <input
                              value={draftSettings[field.titleKey] || ""}
                              onChange={(e) =>
                                updateDraft(field.titleKey, e.target.value)
                              }
                              placeholder="عنوان البطاقة"
                            />
                          </Control>
                          <Control label="وصف البطاقة">
                            <textarea
                              value={draftSettings[field.textKey] || ""}
                              onChange={(e) =>
                                updateDraft(field.textKey, e.target.value)
                              }
                              placeholder="وصف مختصر للميزة"
                            />
                          </Control>
                        </div>
                      ))}
                    </div>
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
                        <button
                          type="button"
                          className={`admin-secondary pages-sticky-btn ${draftSettings.homePagesSticky ? "active" : ""}`}
                          onClick={() =>
                            updateDraft(
                              "homePagesSticky",
                              !draftSettings.homePagesSticky,
                            )
                          }
                        >
                          {draftSettings.homePagesSticky
                            ? "إلغاء تثبيت الشريط"
                            : "تثبيت شريط الصفحات"}
                        </button>

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
