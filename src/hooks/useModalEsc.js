// useModalEsc — fecha o modal aberto ao pressionar ESC, de forma global e consistente.
// Mantém uma PILHA de modais abertos (cada chamada registra seu próprio fechar enquanto
// `ativo` for true). Um único listener no document fecha apenas o modal do TOPO — assim,
// com modais empilhados, cada ESC fecha o de cima, não todos de uma vez.
import { useEffect, useRef } from "react";

const stack = [];
let listening = false;

function handleKey(e) {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  const top = stack[stack.length - 1];
  if (top) top.close();
}

// ativo: boolean (modal visível?) · onClose: função que fecha ESSE modal.
export default function useModalEsc(ativo, onClose) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!ativo) return;
    if (!listening) { document.addEventListener("keydown", handleKey); listening = true; }
    const entry = { close: () => { if (typeof ref.current === "function") ref.current(); } };
    stack.push(entry);
    return () => {
      const i = stack.lastIndexOf(entry);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [ativo]);
}
