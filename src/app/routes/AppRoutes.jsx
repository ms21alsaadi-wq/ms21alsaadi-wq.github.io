import { BrowserRouter, Routes, Route } from 'react-router-dom'

import MainLayout from '../layouts/MainLayout'

import HomePage from '../../pages/Home/HomePage'
import ProductPage from '../../pages/Product/ProductPage'
import CartPage from '../../pages/Cart/CartPage'
import CheckoutPage from '../../pages/Checkout/CheckoutPage'
import AdminPage from '../../pages/Admin/AdminPage'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
