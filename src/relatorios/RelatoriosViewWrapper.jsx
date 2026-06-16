import React from "react";
const RelatoriosViewLazy = React.lazy(() => import("./RelatoriosView.jsx"));
export default function RelatoriosViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <RelatoriosViewLazy {...props} />
    </React.Suspense>
  );
}
