import React from "react";
const PlanilhaViewLazy = React.lazy(() => import("./PlanilhaView.jsx"));
export default function PlanilhaViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <PlanilhaViewLazy {...props} />
    </React.Suspense>
  );
}
