import { useState, useRef, useEffect, useCallback } from "react";

// Reordenar por arrasto, com Pointer Events (mouse E toque no mesmo caminho —
// a API de drag-and-drop do HTML5 não dispara em touch, que é metade do uso
// deste app). Sem dependência nova: o projeto não tem lib de dnd.
//
// Como funciona: ao segurar um card, cada `pointermove` pergunta ao DOM quem
// está embaixo do dedo/cursor (elementFromPoint) e, se for outro card do mesmo
// grupo, troca as posições na hora. O commit só acontece ao soltar.
//
// Uso:
//   const { ordem, arrastando, dragProps } = useDragOrdem(ids, salvar, ativo);
//   <div {...dragProps(id)}>…</div>
export function useDragOrdem(ids, onCommit, ativo = true) {
  const [ordem, setOrdem] = useState(ids);
  const [arrastando, setArrastando] = useState(null);
  const ordemRef = useRef(ids);
  const mudouRef = useRef(false);
  // Quem manda na lógica é o ref: `pointermove` chega antes do re-render do
  // state, e ler o state aqui perderia o primeiro movimento (com toque rápido,
  // perderia o arrasto inteiro). O state existe só pro visual do card.
  const arrastandoRef = useRef(null);

  // Reflete mudanças de fora (KPI que apareceu/sumiu) sem atropelar um arrasto.
  const chave = ids.join("|");
  useEffect(() => {
    if (arrastando) return;
    setOrdem(ids);
    ordemRef.current = ids;
  }, [chave, arrastando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calcula fora do updater do setState de propósito: o React 18 só roda o
  // updater no render seguinte, então marcar "mudou" lá dentro chegaria tarde
  // demais — o pointerup do mesmo gesto ainda leria o valor antigo e não salvaria.
  const mover = useCallback((de, para) => {
    const prev = ordemRef.current;
    const i = prev.indexOf(de), j = prev.indexOf(para);
    if (i < 0 || j < 0 || i === j) return;
    const nova = [...prev];
    nova.splice(j, 0, nova.splice(i, 1)[0]);
    ordemRef.current = nova;
    mudouRef.current = true;
    setOrdem(nova);
  }, []);

  const dragProps = useCallback((id) => {
    if (!ativo) return {};
    return {
      "data-drag-id": id,
      style: { touchAction: "none" },
      onPointerDown: (e) => {
        // Botão de remover e afins seguem clicáveis dentro do card arrastável.
        if (e.target.closest("[data-nodrag]")) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        mudouRef.current = false;
        arrastandoRef.current = id;
        setArrastando(id);
      },
      onPointerMove: (e) => {
        if (arrastandoRef.current !== id) return;
        const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-drag-id]");
        const outro = alvo?.getAttribute("data-drag-id");
        if (outro && outro !== id) mover(id, outro);
      },
      onPointerUp: () => {
        if (arrastandoRef.current !== id) return;
        arrastandoRef.current = null;
        setArrastando(null);
        if (mudouRef.current) onCommit?.(ordemRef.current);
      },
      onPointerCancel: () => { arrastandoRef.current = null; setArrastando(null); },
    };
  }, [ativo, mover, onCommit]);

  return { ordem, arrastando, dragProps };
}
