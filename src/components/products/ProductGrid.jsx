import ProductCard from './ProductCard'

const products = [
  {
    id: 1,
    name: 'Royal Red Roses',
    price: 299,
    image:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 2,
    name: 'Soft Pink Bouquet',
    price: 249,
    image:
      'https://images.unsplash.com/photo-1468327768560-75b778cbb551?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 3,
    name: 'Luxury White Roses',
    price: 399,
    image:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1200&auto=format&fit=crop'
  }
]

function ProductGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
