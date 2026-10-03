// apps/client/src/pages/ReelsView.tsx
//
// La carta de un restaurante (la «Carta Mediterránea», src/carta). La anterior
// (?diseno=clasico) se borró en oct-2026: está en la etiqueta git `carta-clasica`.
import { lazy, Suspense } from 'react';
import { useRestaurant } from '../contexts/RestaurantContext';

const CartaApp = lazy(() => import('../carta/CartaApp'));

function ReelsView() {
  const { restaurant } = useRestaurant();
  return (
    <Suspense fallback={<div className="vt-loader" aria-busy="true"><span /></div>}>
      <CartaApp slug={restaurant.slug} />
    </Suspense>
  );
}

export default ReelsView;
