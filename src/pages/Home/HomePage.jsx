import ProductGrid from '../../components/products/ProductGrid'

function HomePage() {
  return (
    <div className="bg-[#f7f3ee] min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="uppercase tracking-[6px] text-sm text-gray-500 mb-4">
            Luxury Flowers
          </p>

          <h1 className="text-6xl leading-tight font-bold mb-6">
            Elegant Flowers
            <br />
            For Every Moment
          </h1>

          <p className="text-gray-600 text-lg mb-8">
            Premium bouquets & luxury gifts designed with elegance.
          </p>

          <button className="bg-black text-white px-8 py-4 rounded-full hover:opacity-90 transition">
            Shop Now
          </button>
        </div>

        <div>
          <img
            src="https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?q=80&w=1600&auto=format&fit=crop"
            alt="Flowers"
            className="rounded-[40px] h-[650px] w-full object-cover shadow-2xl"
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-4xl font-bold">
            Featured Bouquets
          </h2>
        </div>

        <ProductGrid />
      </section>
    </div>
  )
}

export default HomePage
