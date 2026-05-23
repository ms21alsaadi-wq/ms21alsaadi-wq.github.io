import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          FLOWER STORE
        </Link>

        <nav className="flex gap-6">
          <Link to="/">Home</Link>
          <Link to="/cart">Cart</Link>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
