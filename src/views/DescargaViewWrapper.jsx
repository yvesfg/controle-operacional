import React from "react";
const DescargaViewLazy = React.lazy(() => import("./DescargaView.jsx"));
export default function DescargaViewWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <DescargaViewLazy {...props} />
    </React.Suspense>
  );
}
