import { useState } from 'react';
import { Steps, Button, Typography, Card, Result } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useWizardStore } from '../../../store/useWizardStore';
import { Step1Anagrafica } from './Step1Anagrafica';
import { Step2Finanziamento } from './Step2Finanziamento';
import { Step3Partner } from './Step3Partner';
import { Step4WorkPackage } from './Step4WorkPackage';
import { Step5Personale } from './Step5Personale';

const { Title } = Typography;

const STEPS = [
  { title: 'Anagrafica', description: 'Dati base' },
  { title: 'Finanziamento', description: 'Budget e voci' },
  { title: 'Partner', description: 'Enti coinvolti' },
  { title: 'Struttura WP', description: 'Work Package' },
  { title: 'Personale', description: 'Allocazioni' },
];

export function WizardProgetto() {
  const navigate = useNavigate();
  const { id: urlId } = useParams<{ id: string }>();
  const { stepCorrente, avanzaStep, tornaStep, reset } = useWizardStore();
  const [completato, setCompletato] = useState(false);
  const [idProgetto, setIdProgetto] = useState<string>(urlId ?? '');

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
          <Step5Personale progettoId={idProgetto}
            onCompletato={() => handleStepCompletato()} onIndietro={tornaStep} />
        )}
      </Card>
    </div>
  );
}
