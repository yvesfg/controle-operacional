import React from "react";
const FinanceiroViewLazy = React.lazy(() => import("./FinanceiroView.jsx"));
export default function FinanceiroViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <FinanceiroViewLazy {...props} />
    </React.Suspense>
  );
}
