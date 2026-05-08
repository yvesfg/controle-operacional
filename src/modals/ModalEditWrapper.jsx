import React from "react";
const ModalEditLazy = React.lazy(() => import("./ModalEdit.jsx"));
export default function ModalEditWrapper({ ctx }) {
  return (
    <React.Suspense fallback={null}>
      <ModalEditLazy ctx={ctx} />
    </React.Suspense>
  );
}
