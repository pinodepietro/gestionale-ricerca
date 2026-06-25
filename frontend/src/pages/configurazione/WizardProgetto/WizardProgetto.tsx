import { useState } from 'react';
import { Steps, Button, Typography, Card, Result } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWizardStore } from '../../../store/useWizardStore';
import { progettiApi } from '../../../api/progetti';
import { queryKeys } from '../../../utils/queryKeys';
import { Step1Anagrafica } from './Step1Anagrafica';
import { Step2Finanziamento } from './Step2Finanziamento';
import { Step3Partner } from './Step3Partner';
import { Step4WorkPackage } from './Step4WorkPackage';
import { Step5Personale } from './Step5Personale';
import { Step6BudgetWP } from './Step6BudgetWP';
import { Step7PersonaleWP } from './Step7PersonaleWP';

const { Title } = Typography;

const STEPS_BASE = [
  { title: 'Anagrafica', description: 'Dati base' },
  { title: 'Finanziamento', description: 'Budget e voci' },
  { title: 'Partner', description: 'Enti coinvolti' },
  { title: 'Struttura WP', description: 'Work Package' },
  { title: 'Personale', description: 'Allocazioni' },
];

const STEPS_WP = [
  ...STEPS_BASE,
  { title: 'Budget per WP', description: 'Ripartizione budget' },
  { title: 'Personale per WP', description: 'Ripartizione ore' },
];

export function WizardProgetto() {
  const navigate = useNavigate();
  const { id: urlId } = useParams<{ id: string }>();
  const { stepCorrente, avanzaStep, tornaStep, reset } = useWizardStore();
  const [completato, setCompletato] = useState(false);
  const [idProgetto, setIdProgetto] = useState<string>(urlId ?? '');

  const { data: progetto } = useQuery({
    queryKey: queryKeys.progetti.detail(idProgetto),
    queryFn: () => progettiApi.get(idProgetto).then(r => r.data.data),
    enabled: !!idProgetto,
  });
  const gestionePerWp: boolean = progetto?.gestione_per_wp ?? false;

  const STEPS = gestionePerWp ? STEPS_WP : STEPS_BASE;

  function handleStepCompletato(nuovoId?: string) {
    if (nuovoId && typeof nuovoId === 'string') {
      setIdProgetto(nuovoId);
    }
    if (stepCorrente < STEPS.length - 1) {
      avanzaStep();
    } else {
      setCompletato(true);
      reset();
    }
  }

  if (completato) {
    return (
      <Result
        status="success"
        title="Progetto configurato con successo"
        subTitle="Il progetto è in stato bozza. Puoi attivarlo dalla scheda progetto quando sei pronto."
        extra={[
          <Button type="primary" key="scheda" onClick={() => navigate('/progetti/' + idProgetto)}>
            Vai alla scheda progetto
          </Button>,
          <Button key="lista" onClick={() => navigate('/configurazione')}>
            Torna alla lista
          </Button>,
        ]}
      />
    );
  }

  return (
    <div>
      <Button type="link" style={{ marginBottom: 24 }}
        onClick={() => { reset(); navigate('/configurazione'); }}>
        ← Torna alla lista
      </Button>
      <Title level={2} style={{ marginBottom: 24 }}>
        {urlId ? 'Modifica progetto' : 'Nuovo progetto'}
      </Title>
      <Steps current={stepCorrente} items={STEPS} style={{ marginBottom: 32 }} />
      <Card>
        {stepCorrente === 0 && (
          <Step1Anagrafica progettoId={idProgetto || null} onCompletato={handleStepCompletato} />
        )}
        {stepCorrente === 1 && idProgetto && (
          <Step2Finanziamento progettoId={idProgetto}
            onCompletato={() => handleStepCompletato()} onIndietro={tornaStep} />
        )}
        {stepCorrente === 2 && idProgetto && (
          <Step3Partner progettoId={idProgetto}
            onCompletato={() => handleStepCompletato()} onIndietro={tornaStep} />
        )}
        {stepCorrente === 3 && idProgetto && (
          <Step4WorkPackage progettoId={idProgetto}
            onCompletato={() => handleStepCompletato()} onIndietro={tornaStep} />
        )}
        {stepCorrente === 4 && idProgetto && (
          <Step5Personale progettoId={idProgetto} gestionePerWp={gestionePerWp}
            onCompletato={() => handleStepCompletato()} onIndietro={tornaStep} />
        )}
        {stepCorrente === 5 && idProgetto && gestionePerWp && (
          <Step6BudgetWP progettoId={idProgetto}
            onCompletato={() => handleStepCompletato()} onIndietro={tornaStep} />
        )}
        {stepCorrente === 6 && idProgetto && gestionePerWp && (
          <Step7PersonaleWP progettoId={idProgetto}
            onCompletato={() => handleStepCompletato()} onIndietro={tornaStep} />
        )}
      </Card>
    </div>
  );
}
