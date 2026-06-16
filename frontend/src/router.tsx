import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProgettiPage } from './pages/progetti/ProgettiPage';
import { ProgettoPage } from './pages/progetti/ProgettoPage';
import { PortfolioPage } from './pages/progetti/PortfolioPage';
import { ConfigurazionePage } from './pages/configurazione/ConfigurazionePage';
import { WizardProgetto } from './pages/configurazione/WizardProgetto/WizardProgetto';
import { PersonalePage } from './pages/personale/PersonalePage';
import { PersonaPage } from './pages/personale/PersonaPage';
import { PartnerPage } from './pages/partner/PartnerPage';
import { TimesheetPage } from './pages/timesheet/TimesheetPage';
import { TimesheetEditor } from './pages/timesheet/TimesheetEditor';
import { SalPage } from './pages/sal/SalPage';
import { AdminPage } from './pages/admin/AdminPage';
import { SalDettaglioPage } from './pages/sal/SalDettaglioPage';
import { LoginPage } from './pages/auth/LoginPage';
import { CambioPasswordPage } from './pages/auth/CambioPasswordPage';
import { PropostePage } from './pages/proposte/PropostePage';
import { PropostaFormPage } from './pages/proposte/PropostaFormPage';
import { PropostaDettaglioPage } from './pages/proposte/PropostaDettaglioPage';
import { AutorizzazioniPage } from './pages/autorizzazioni/AutorizzazioniPage';
import { AutorizzazioneFormPage } from './pages/autorizzazioni/AutorizzazioneFormPage';
import { AutorizzazioneDettaglioPage } from './pages/autorizzazioni/AutorizzazioneDettaglioPage';
import { RimborsiSpesaPage } from './pages/rimborsi-spesa/RimborsiSpesaPage';
import { RimborsoSpesaNuovoPage } from './pages/rimborsi-spesa/RimborsoSpesaNuovoPage';
import { RimborsoSpesaDettaglioPage } from './pages/rimborsi-spesa/RimborsoSpesaDettaglioPage';
import { MissioniListaPage } from './pages/missioni/MissioniListaPage';
import { MissioneFormPage } from './pages/missioni/MissioneFormPage';
import { MissioneDettaglioPage } from './pages/missioni/MissioneDettaglioPage';
import { RimborsoMissioneDettaglioPage } from './pages/missioni/RimborsoMissioneDettaglioPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/cambia-password', element: <CambioPasswordPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'progetti', element: <ProgettiPage /> },
      { path: 'progetti/:id', element: <ProgettoPage /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'configurazione', element: <ConfigurazionePage /> },
      { path: 'configurazione/nuovo', element: <WizardProgetto /> },
      { path: 'configurazione/:id', element: <WizardProgetto /> },
      { path: 'personale', element: <PersonalePage /> },
      { path: 'personale/:id', element: <PersonaPage /> },
      { path: 'partner', element: <PartnerPage /> },
      { path: 'timesheet', element: <TimesheetPage /> },
      { path: 'timesheet/:id', element: <TimesheetEditor /> },
      { path: 'sal', element: <SalPage /> },
      { path: 'sal/:id', element: <SalDettaglioPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'proposte', element: <PropostePage /> },
      { path: 'proposte/nuova', element: <PropostaFormPage /> },
      { path: 'proposte/:id', element: <PropostaDettaglioPage /> },
      { path: 'proposte/:id/modifica', element: <PropostaFormPage /> },
      { path: 'autorizzazioni', element: <AutorizzazioniPage /> },
      { path: 'autorizzazioni/nuova', element: <AutorizzazioneFormPage /> },
      { path: 'autorizzazioni/:id', element: <AutorizzazioneDettaglioPage /> },
      { path: 'autorizzazioni/:id/modifica', element: <AutorizzazioneFormPage /> },
      { path: 'rimborsi-spesa', element: <RimborsiSpesaPage /> },
      { path: 'rimborsi-spesa/nuovo', element: <RimborsoSpesaNuovoPage /> },
      { path: 'rimborsi-spesa/:id', element: <RimborsoSpesaDettaglioPage /> },
      { path: 'missioni', element: <MissioniListaPage /> },
      { path: 'missioni/nuova', element: <MissioneFormPage /> },
      { path: 'missioni/:id', element: <MissioneDettaglioPage /> },
      { path: 'missioni/:id/modifica', element: <MissioneFormPage /> },
      { path: 'rimborsi-missione/:id', element: <RimborsoMissioneDettaglioPage /> },
    ],
  },
]);
