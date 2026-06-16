import React from "react";
const PainelFinanceiroLazy = React.lazy(() => import("./PainelFinanceiro.jsx"));
export default function PainelFinanceiroWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <PainelFinanceiroLazy {...props} />
    </React.Suspense>
  );
}
