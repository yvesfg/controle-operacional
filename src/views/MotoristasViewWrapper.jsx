import React from "react";
const MotoristasViewLazy = React.lazy(() => import("./MotoristasView.jsx"));
export default function MotoristasViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <MotoristasViewLazy {...props} />
    </React.Suspense>
  );
}
