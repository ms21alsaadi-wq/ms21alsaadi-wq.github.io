function AdminPage() {
  return (
    <div className="min-h-screen bg-[#f7f3ee] px-6 py-32">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold mb-10">
          Admin Dashboard
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold mb-2">
              Orders
            </h2>

            <p className="text-gray-500">
              Manage customer orders.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold mb-2">
              Products
            </h2>

            <p className="text-gray-500">
              Add & edit bouquets.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold mb-2">
              Analytics
            </h2>

            <p className="text-gray-500">
              View sales performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
