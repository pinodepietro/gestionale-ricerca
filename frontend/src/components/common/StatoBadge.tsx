// frontend/src/components/common/StatoBadge.tsx
import { Tag } from 'antd';
import { COLORI_STATO_PROGETTO, COLORI_STATO_SAL } from '../../config/constants';
import type { StatoProgetto, StatoSal } from '../../config/constants';

interface ProgettoProps {
  tipo: 'progetto';
  stato: StatoProgetto;
}

interface SalProps {
  tipo: 'sal';
  stato: StatoSal;
}

type Props = ProgettoProps | SalProps;

const LABEL_PROGETTO: Record<StatoProgetto, string> = {
  bozza: 'Bozza',
  attivo: 'Attivo',
  chiuso: 'Chiuso',
  rendicontato: 'Rendicontato',
};

const LABEL_SAL: Record<StatoSal, string> = {
  aperto: 'Aperto',
  chiuso: 'Chiuso',
  inviato: 'Inviato',
  contestato: 'Contestato',
  rendicontato: 'Rendicontato',
};

export function StatoBadge(props: Props) {
  if (props.tipo === 'progetto') {
    return (
      <Tag color={COLORI_STATO_PROGETTO[props.stato]}>
        {LABEL_PROGETTO[props.stato]}
      </Tag>
    );
  }

  return (
    <Tag color={COLORI_STATO_SAL[props.stato]}>
      {LABEL_SAL[props.stato]}
    </Tag>
  );
}
