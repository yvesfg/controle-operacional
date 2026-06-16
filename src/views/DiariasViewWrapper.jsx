import React from "react";
const DiariasViewLazy = React.lazy(() => import("./DiariasView.jsx"));
export default function DiariasViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <DiariasViewLazy {...props} />
    </React.Suspense>
  );
}
