import { useEffect, useState } from 'react'

import { getProducts } from '../services/firebase/products'

function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts()
        setProducts(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  return {
    products,
    loading
  }
}

export default useProducts
