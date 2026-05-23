import ProductCard from './ProductCard'

const products = [
  {
    id: 1,
    name: 'Red Roses Bouquet',
    price: 299,
    image: 'https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?q=80&w=1200&auto=format&fit=crop'
  }
]

function ProductGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  )
}

export default ProductGrid
