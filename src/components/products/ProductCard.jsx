import { Link } from 'react-router-dom'

function ProductCard({ product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="group bg-white rounded-[30px] overflow-hidden shadow-sm hover:shadow-2xl transition duration-300"
    >
      <div className="overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-[420px] object-cover group-hover:scale-105 transition duration-500"
        />
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-semibold mb-2">
          {product.name}
        </h3>

        <p className="text-gray-500 text-lg">
          {product.price} SAR
        </p>
      </div>
    </Link>
  )
}

export default ProductCard
