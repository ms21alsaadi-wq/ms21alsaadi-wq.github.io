import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-black tracking-wide"
        >
          BLOOM
        </Link>

        <nav className="flex items-center gap-8 text-sm font-medium">
          <Link to="/">Home</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
