import ProductGrid from '../../components/products/ProductGrid'

function HomePage() {
  return (
    <div className="px-4 py-10 max-w-7xl mx-auto">
      <section className="mb-10">
        <h1 className="text-5xl font-bold mb-4">
          Luxury Flower Store
        </h1>

        <p className="text-gray-600 text-lg">
          Premium flowers & gifts.
        </p>
      </section>

      <ProductGrid />
    </div>
  )
}

export default HomePage
