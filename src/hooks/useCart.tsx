import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const foundProduct = cart.find(product => product.id === productId);

      if (foundProduct) {
        updateProductAmount({productId, amount: foundProduct.amount + 1});
      } else {
        const {data : newProduct } = await api.get<Product>(`/products/${productId}`);

        if(newProduct) {
        const newCart =[...cart, {...newProduct, amount: 1}];
        setCart(newCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));}
        else {
          throw new Error();
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const foundProduct = cart.find(product => product.id === productId);
      
      if(!foundProduct) {
        throw new Error();
      }

      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        throw new Error();
      }
      
      const { data: response } = await api.get<Stock>(`stock/${productId}`);

      const stock = response.amount;
      
      if(stock < amount) {
        throw new Error('stock');
      }
      
      const newCart = cart.map(product => 
        product.id !== productId ? product : {...product, amount}
      );

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      
    } catch(error) {
      if(error.message === 'stock') {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        toast.error('Erro na alteração de quantidade do produto');
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
