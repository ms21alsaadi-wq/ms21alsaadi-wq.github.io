import { Heart, Star } from "lucide-react";
import { productPath } from "../SEOManager.jsx";
import { formatPrice, sizesArray } from "../../utils/helpers.js";

function ProductGrid({
  products = [],
  go,
  addToCart,
  favorites = [],
  setFavorites,
  selectedSize = {},
  setSelectedSize,
  className = "",
  showFavorite = true,
  showRating = true,
  showSizes = true,
  showAddToCart = true,
}) {
  return (
    <div className={`products-grid ${className}`.trim()}>
      {products.map((product) => {
        const sizes = sizesArray(product.sizes);

        return (
          <article
            className="product product-link-card"
            key={product.id}
            role="button"
            tabIndex={0}
            onClick={() => go(productPath(product))}
            onKeyDown={(event) => {
              if (event.key === "Enter") go(productPath(product));
            }}
          >
            <div className="product-img">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                decoding="async"
              />
              <span>{product.tag}</span>
              {showFavorite && setFavorites && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setFavorites((prev) =>
                      prev.includes(product.id)
                        ? prev.filter((id) => id !== product.id)
                        : [...prev, product.id],
                    );
                  }}
                >
                  <Heart
                    className={favorites.includes(product.id) ? "heart-on" : ""}
                  />
                </button>
              )}
            </div>
            <div className="product-body">
              <div className="product-top">
                <div>
                  <small>{product.brand}</small>
                  <h3>{product.name}</h3>
                </div>
                <em>{product.category}</em>
              </div>
              {showRating && (
                <div className="rating">
                  <Star size={15} fill="currentColor" /> {product.rating}
                </div>
              )}
              {showSizes && sizes.length > 0 && setSelectedSize && (
                <div className="sizes">
                  {sizes.map((size) => (
                    <button
                      className={
                        (selectedSize[product.id] || sizes[0]) === size
                          ? "active"
                          : ""
                      }
                      key={size}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedSize((prev) => ({
                          ...prev,
                          [product.id]: size,
                        }));
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
              <div className="product-foot">
                <div>
                  <b>{formatPrice(product.price)} ر.س</b>
                  {product.oldPrice && (
                    <del>{formatPrice(product.oldPrice)} ر.س</del>
                  )}
                </div>
                {showAddToCart && addToCart && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      addToCart(product);
                    }}
                  >
                    أضف
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default ProductGrid;
