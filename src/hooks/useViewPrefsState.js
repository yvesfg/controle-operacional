import { useState } from "react";
import { loadJSON, saveJSON } from "../utils.js";

export function useViewPrefsState() {
  const [diariaView, setDiariaView] = useState(() => loadJSON("co_diaria_view", "blocos"));
  const [diariaCols, setDiariaCols] = useState(() => {
    // Migration: padroniza diariaCols para 3 (Abr 2026)
    const MK = "co_diaria_cols_migv3";
    if (!loadJSON(MK, false)) {
      saveJSON("co_diaria_cols", 3);
      saveJSON(MK, true);
      return 3;
    }
    return loadJSON("co_diaria_cols", 3);
  });
  const [descargaView, setDescargaView] = useState(() => loadJSON("co_descarga_view", "blocos"));
  const [descargaCols, setDescargaCols] = useState(() => loadJSON("co_descarga_cols", 2));
  const [diariaNavDT, setDiariaNavDT] = useState(null);
  const [descargaNavDT, setDescargaNavDT] = useState(null);

  return {
    diariaView, setDiariaView, diariaCols, setDiariaCols,
    descargaView, setDescargaView, descargaCols, setDescargaCols,
    diariaNavDT, setDiariaNavDT, descargaNavDT, setDescargaNavDT,
  };
}
