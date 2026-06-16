import React from "react";
const PlanilhaAVBLazy = React.lazy(() => import("./PlanilhaAVB.jsx"));
export default function PlanilhaAVBWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <PlanilhaAVBLazy {...props} />
    </React.Suspense>
  );
}
