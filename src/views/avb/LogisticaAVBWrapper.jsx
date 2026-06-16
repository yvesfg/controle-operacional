import React from "react";
const LogisticaAVBLazy = React.lazy(() => import("./LogisticaAVB.jsx"));
export default function LogisticaAVBWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <LogisticaAVBLazy {...props} />
    </React.Suspense>
  );
}
