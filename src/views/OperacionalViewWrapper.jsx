import React from "react";
const OperacionalViewLazy = React.lazy(() => import("./OperacionalView.jsx"));
export default function OperacionalViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <OperacionalViewLazy {...props} />
    </React.Suspense>
  );
}
