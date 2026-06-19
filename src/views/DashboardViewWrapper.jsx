// Dashboard é a tela inicial: carregamento eager evita corrida do gráfico
// (o canvas precisa estar montado quando o useEffect do Chart roda no App.jsx).
import DashboardView from "./DashboardView.jsx";
export default DashboardView;
