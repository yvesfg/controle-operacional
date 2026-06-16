import React from "react";
const ResultadoLazy = React.lazy(() => import("./Resultado.jsx"));
export default function ResultadoWrapper(props) {
  return (
    <React.Suspense fallback={null}>
      <ResultadoLazy {...props} />
    </React.Suspense>
  );
}
