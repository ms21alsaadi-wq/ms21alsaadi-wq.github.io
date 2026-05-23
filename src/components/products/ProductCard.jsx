import { Link } from 'react-router-dom'

function ProductCard({ product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="border rounded-3xl overflow-hidden hover:shadow-xl transition"
    >
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-80 object-cover"
      />

      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">
          {product.name}
        </h3>

        <p className="text-gray-500">
          {product.price} SAR
        </p>
      </div>
    </Link>
  )
}

export default ProductCard
