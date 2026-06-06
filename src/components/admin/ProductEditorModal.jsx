import { Save } from "lucide-react";
import ProductEditorFields from "./ProductEditorFields.jsx";
import ProductOptionsEditor from "./ProductOptionsEditor.jsx";

export default function ProductEditorModal({
  addProductOption,
  editing,
  galleryImages,
  imagePreview,
  makeGalleryImagePrimary,
  productFormTab,
  productOptions,
  productPreview,
  removeGalleryImage,
  removeProductOption,
  resetProductEditor,
  saveProduct,
  setImagePreview,
  setProductFormTab,
  setProductPreview,
  t,
  updateProductOption,
  updateProductPreviewFromField,
  updateProductPreviewFromForm,
  uploadGalleryImages,
}) {
  return (
    <div className="product-modal-backdrop" onClick={resetProductEditor}>
      <div className="product-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="admin-card product-form-card pro-form-card full-product-form-card products-form-compact-final">
          <div className="pro-card-head">
            <div>
              <span>Product editor</span>
              <h2>{editing ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={resetProductEditor}
            >
              ×
            </button>
          </div>

          <div className="product-modal-tabs" role="tablist">
            <button
              type="button"
              className={productFormTab === "info" ? "active" : ""}
              onClick={() => setProductFormTab("info")}
            >
              ١ المعلومات
            </button>
            <button
              type="button"
              className={productFormTab === "pricing" ? "active" : ""}
              onClick={() => setProductFormTab("pricing")}
            >
              ٢ الأسعار والمخزون
            </button>
            <button
              type="button"
              className={productFormTab === "images" ? "active" : ""}
              onClick={() => setProductFormTab("images")}
            >
              ٣ الصور
            </button>
            <button
              type="button"
              className={productFormTab === "options" ? "active" : ""}
              onClick={() => setProductFormTab("options")}
            >
              ٤ الخيارات
            </button>
            <button
              type="button"
              className={productFormTab === "seo" ? "active" : ""}
              onClick={() => setProductFormTab("seo")}
            >
              ٥ SEO
            </button>
          </div>

          <form
            id="product-editor-form"
            onSubmit={saveProduct}
            onChange={updateProductPreviewFromForm}
            className={`product-form products-six-card-form product-editor-tabs-form active-tab-${productFormTab}`}
          >
            {productFormTab === "options" && (
              <ProductOptionsEditor
                addProductOption={addProductOption}
                productOptions={productOptions}
                productPreview={productPreview}
                removeProductOption={removeProductOption}
                t={t}
                updateProductOption={updateProductOption}
              />
            )}
            <ProductEditorFields
              editing={editing}
              galleryImages={galleryImages}
              imagePreview={imagePreview}
              makeGalleryImagePrimary={makeGalleryImagePrimary}
              productPreview={productPreview}
              removeGalleryImage={removeGalleryImage}
              setImagePreview={setImagePreview}
              setProductPreview={setProductPreview}
              t={t}
              updateProductPreviewFromField={updateProductPreviewFromField}
              uploadGalleryImages={uploadGalleryImages}
            />
          </form>
        </div>

        <div className="product-modal-footer">
          <button
            type="button"
            className="admin-secondary"
            onClick={resetProductEditor}
          >
            {t("cancel")}
          </button>
          <div className="product-modal-footer-actions">
            <button
              type="button"
              className="admin-secondary"
              onClick={() => setProductFormTab("info")}
            >
              مراجعة المعلومات
            </button>
            <button
              type="submit"
              form="product-editor-form"
              className="admin-primary"
            >
              <Save size={16} /> {editing ? "حفظ التعديل" : "حفظ وإضافة المنتج"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
