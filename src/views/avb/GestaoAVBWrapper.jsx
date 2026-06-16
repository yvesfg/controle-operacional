import React from "react";
const GestaoAVBLazy = React.lazy(() => import("./GestaoAVB.jsx"));
export default function GestaoAVBWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <GestaoAVBLazy {...props} />
    </React.Suspense>
  );
}
