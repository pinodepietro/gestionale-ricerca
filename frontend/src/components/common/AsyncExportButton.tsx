// frontend/src/components/common/AsyncExportButton.tsx
import { useState } from 'react';
import { Button, notification } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { salApi } from '../../api/sal';
import { sleep } from '../../utils/formatters';
import type { ExportSalRequest } from '../../types/timesheet';
import type { ExportFormato } from '../../config/constants';

interface Props {
  salId: string;
  formato: ExportFormato;
  includiTimesheet?: boolean;
  includiSpese?: boolean;
  label?: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30; // 60 secondi massimo

export function AsyncExportButton({
  salId,
  formato,
  includiTimesheet = true,
  includiSpese = false,
  label,
}: Props) {
  const [stato, setStato] = useState<'idle' | 'attesa' | 'errore'>('idle');

  async function handleExport() {
    setStato('attesa');

    try {
      const payload: ExportSalRequest = {
        formato,
        includi_timesheet: includiTimesheet,
        includi_spese: includiSpese,
      };

      // Step 1 — avvia export asincrono
      const { data: jobResponse } = await salApi.avviaExport(salId, payload);
      const job = jobResponse.data;

      // Step 2 — polling sullo stato del job
      let tentativi = 0;
      while (tentativi < MAX_POLLS) {
        await sleep(POLL_INTERVAL_MS);
        const { data: statusResponse } = await salApi.getJobStatus(job.job_id);
        const status = statusResponse.data;

        if (status.stato === 'completato' && status.download_url) {
          // Step 3 — download diretto
          window.location.href = status.download_url;
          setStato('idle');
          return;
        }

        if (status.stato === 'errore') {
          notification.error({
            message: 'Errore durante la generazione del documento',
            description: status.error_message,
            duration: 5,
          });
          setStato('errore');
          return;
        }

        tentativi++;
      }

      notification.error({
        message: 'Timeout',
        description: 'La generazione sta impiegando troppo tempo. Riprova tra qualche minuto.',
        duration: 5,
      });
      setStato('errore');

    } catch {
      setStato('errore');
    }
  }

  return (
    <Button
      icon={<DownloadOutlined />}
      loading={stato === 'attesa'}
      onClick={handleExport}
      // Dopo un errore si può riprovare cliccando di nuovo
      onMouseEnter={() => { if (stato === 'errore') setStato('idle'); }}
    >
      {stato === 'attesa'
        ? 'Generazione in corso...'
        : (label ?? `Esporta ${formato.toUpperCase()}`)}
    </Button>
  );
}
