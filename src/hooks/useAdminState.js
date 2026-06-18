import { useState } from "react";
import { loadJSON } from "../utils.js";

export function useAdminState() {
  // Email template
  const [emailTemplateOpen, setEmailTemplateOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(() => loadJSON("co_email_template", {
    assunto: "Bem-vindo ao Controle Operacional — YFGroup",
    corpo: `Olá {nome},\n\nSeu acesso ao sistema de Controle Operacional da YFGroup foi criado com sucesso!\n\nSeus dados de acesso:\n- Email: {email}\n- Senha temporária: {senha}\n- Perfil: {perfil}\n\nAcesse o sistema em: https://controle-operacional-omega.vercel.app\n\nRecomendamos trocar sua senha no primeiro acesso.\n\nAtenciosamente,\nAdministração — YFGroup`,
  }));
  const [usuarioEmailPreview, setUsuarioEmailPreview] = useState(null);

  // Log de alterações
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [logsSubTab, setLogsSubTab] = useState("dev");

  return {
    emailTemplateOpen, setEmailTemplateOpen,
    emailTemplate, setEmailTemplate,
    usuarioEmailPreview, setUsuarioEmailPreview,
    logsOpen, setLogsOpen,
    logsData, setLogsData,
    logsSubTab, setLogsSubTab,
  };
}
