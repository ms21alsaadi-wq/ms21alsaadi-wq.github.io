import { create } from 'zustand'

const useCartStore = create((set) => ({
  cart: [],

  addToCart: (product) =>
    set((state) => ({
      cart: [...state.cart, product]
    })),

  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter(
        (item) => item.id !== id
      )
    }))
}))

export default useCartStore
