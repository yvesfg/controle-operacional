import React from "react";
const CreditosPendentesLazy = React.lazy(() => import("./CreditosPendentes.jsx"));
export default function CreditosPendentesWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <CreditosPendentesLazy {...props} />
    </React.Suspense>
  );
}
