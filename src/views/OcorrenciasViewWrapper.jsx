import React from "react";
const OcorrenciasViewLazy = React.lazy(() => import("./OcorrenciasView.jsx"));
export default function OcorrenciasViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <OcorrenciasViewLazy {...props} />
    </React.Suspense>
  );
}
