import React from "react";
const CadastrosViewLazy = React.lazy(() => import("./CadastrosView.jsx"));
export default function CadastrosViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <CadastrosViewLazy {...props} />
    </React.Suspense>
  );
}
