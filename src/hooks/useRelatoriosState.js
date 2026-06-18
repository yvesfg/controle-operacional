import { useState } from "react";

export function useRelatoriosState() {
  const [relGeralOpen, setRelGeralOpen]             = useState(false);
  const [reportBuilderOpen, setReportBuilderOpen]   = useState(false);
  const [relGeralFrom, setRelGeralFrom]             = useState("");
  const [relGeralTo, setRelGeralTo]                 = useState("");
  const [relGeralMotorista, setRelGeralMotorista]   = useState("");
  const [relGeralStatus, setRelGeralStatus]         = useState("");
  const [relGeralOrigem, setRelGeralOrigem]         = useState("");
  const [relGeralDestino, setRelGeralDestino]       = useState("");
  const [relGeralVinculo, setRelGeralVinculo]       = useState("");
  const [relGeralSecoes, setRelGeralSecoes]         = useState({kpi:true,sumario:true,registros:true,sgs:true,ocorr_dt:true,diarias:false,descargas:false});
  const [relGeralLoading, setRelGeralLoading]       = useState(false);
  const [relGeralStatusOper, setRelGeralStatusOper] = useState("");
  const [relMenuOpen, setRelMenuOpen]               = useState(false);
  const [relOperOpen, setRelOperOpen]               = useState(false);
  const [relOperFrom, setRelOperFrom]               = useState("");
  const [relOperTo, setRelOperTo]                   = useState("");
  const [relOperSecoes, setRelOperSecoes]           = useState({sgs:true,apontamentos:true});
  const [relDiariaOpen, setRelDiariaOpen]           = useState(false);
  const [relDiariaFrom, setRelDiariaFrom]           = useState("");
  const [relDiariaTo, setRelDiariaTo]               = useState("");
  const [relDiariaMotorista, setRelDiariaMotorista] = useState("");
  const [relDiariaVinculo, setRelDiariaVinculo]     = useState("");
  const [relDiariaStatus, setRelDiariaStatus]       = useState("");
  const [relDescargaOpen, setRelDescargaOpen]       = useState(false);
  const [relCtrlDccOpen, setRelCtrlDccOpen]         = useState(false);
  const [relCtrlDccFrom, setRelCtrlDccFrom]         = useState("");
  const [relCtrlDccTo, setRelCtrlDccTo]             = useState("");
  const [auditReport, setAuditReport]               = useState(null);
  const [relDescargaFrom, setRelDescargaFrom]       = useState("");
  const [relDescargaTo, setRelDescargaTo]           = useState("");
  const [relDescargaMotorista, setRelDescargaMotorista] = useState("");
  const [relDescargaStatus, setRelDescargaStatus]   = useState("");

  return {
    relGeralOpen, setRelGeralOpen, reportBuilderOpen, setReportBuilderOpen,
    relGeralFrom, setRelGeralFrom, relGeralTo, setRelGeralTo,
    relGeralMotorista, setRelGeralMotorista, relGeralStatus, setRelGeralStatus,
    relGeralOrigem, setRelGeralOrigem, relGeralDestino, setRelGeralDestino,
    relGeralVinculo, setRelGeralVinculo, relGeralSecoes, setRelGeralSecoes,
    relGeralLoading, setRelGeralLoading, relGeralStatusOper, setRelGeralStatusOper,
    relMenuOpen, setRelMenuOpen, relOperOpen, setRelOperOpen,
    relOperFrom, setRelOperFrom, relOperTo, setRelOperTo, relOperSecoes, setRelOperSecoes,
    relDiariaOpen, setRelDiariaOpen, relDiariaFrom, setRelDiariaFrom, relDiariaTo, setRelDiariaTo,
    relDiariaMotorista, setRelDiariaMotorista, relDiariaVinculo, setRelDiariaVinculo, relDiariaStatus, setRelDiariaStatus,
    relDescargaOpen, setRelDescargaOpen, relCtrlDccOpen, setRelCtrlDccOpen,
    relCtrlDccFrom, setRelCtrlDccFrom, relCtrlDccTo, setRelCtrlDccTo,
    auditReport, setAuditReport,
    relDescargaFrom, setRelDescargaFrom, relDescargaTo, setRelDescargaTo,
    relDescargaMotorista, setRelDescargaMotorista, relDescargaStatus, setRelDescargaStatus,
  };
}
