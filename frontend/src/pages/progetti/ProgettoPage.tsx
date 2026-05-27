// frontend/src/pages/progetti/ProgettoPage.tsx
import { useState } from 'react';
import { Tabs, Typography, Spin, Button, Space, Modal, Alert, List, App, Popconfirm, Dropdown } from 'antd';
import { ArrowLeftOutlined, RocketOutlined, EditOutlined, FileExcelOutlined, FilePdfOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/useAuthStore';
import { env } from '../../config/env';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { progettiApi } from '../../api/progetti';
import { queryKeys } from '../../utils/queryKeys';
import { StatoBadge } from '../../components/common/StatoBadge';
import { RbacGuard } from '../../components/common/RbacGuard';
import { useAttivaProgetto, useChiudiProgetto } from '../../hooks/useProgetti';
import { TabGantt } from './tabs/TabGantt';
import { TabBudget } from './tabs/TabBudget';
import { TabSal } from './tabs/TabSal';
import { TabPersonale } from './tabs/TabPersonale';
import { TabDocumenti } from './tabs/TabDocumenti';
import { TabTimesheet } from './tabs/TabTimesheet';
import { TabSpese } from './tabs/TabSpese';
import { TabImpegni } from './tabs/TabImpegni';
import { TabPartner } from './tabs/TabPartner';
import { ModificaProgettoDrawer } from './ModificaProgettoDrawer';

const { Title, Text } = Typography;

type PreAttivazionError = {
  detail: { error: { code: string; message: string; dettagli?: string[] } };
};

export function ProgettoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notification } = App.useApp();

  const [modalAperta, setModalAperta] = useState(false);
  const [drawerAperto, setDrawerAperto] = useState(false);
  const [erroriPreAttivazione, setErroriPreAttivazione] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.progetti.detail(id!),
    queryFn: () => progettiApi.get(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const attivaProgetto = useAttivaProgetto();
  const chiudiProgetto = useChiudiProgetto();
  const user = useAuthStore(s => s.user);

  const downloadReport = async (formato: 'pdf' | 'xlsx') => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${env.apiUrl}/api/v1/progetti/${id}/report/${formato}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) { notification.error({ message: 'Errore generazione report' }); return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const oggi = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomeProgetto = data?.acronimo || data?.codice || data?.titolo?.slice(0, 30) || id;
    a.download = `Report_${nomeProgetto}_${oggi}.${formato}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const apriModal = () => {
    setErroriPreAttivazione([]);
    setModalAperta(true);
  };

  const handleConfermaAttivazione = () => {
    attivaProgetto.mutate(id!, {
      onSuccess: () => {
        setModalAperta(false);
      },
      onError: (error: unknown) => {
        const axiosError = error as AxiosError<PreAttivazionError>;
        const errData = axiosError.response?.data?.detail?.error;
        if (errData?.code === 'PRE_ATTIVAZIONE_FALLITA' && errData.dettagli?.length) {
          setErroriPreAttivazione(errData.dettagli);
        } else {
          setModalAperta(false);
          notification.error({ message: errData?.message ?? "Errore durante l'attivazione" });
        }
      },
    });
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!data) return <Text type="danger">Progetto non trovato.</Text>;

  const eBozza = data.stato === 'bozza';
  const eAttivo = data.stato === 'attivo';
  const puoGenerareReport = user?.ruolo === 'superadmin' || user?.id === data.amministrativo_id;

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate('/progetti')}>
          Tutti i progetti
        </Button>
      </Space>

      <div style={{ marginBottom: 16 }}>
        <Space align="center" wrap>
          <Title level={2} style={{ margin: 0 }}>{data.acronimo || data.codice}</Title>
          <StatoBadge tipo="progetto" stato={data.stato} />
          <Text type="secondary">{data.tipo}</Text>

          <RbacGuard azione="progetto:chiudi">
            {eAttivo && (
              <Popconfirm
                title="Chiudere questo progetto?"
                description="Il progetto passerà in stato chiuso. Potrai ancora rendicontare ma non inserire nuove attività."
                onConfirm={() => chiudiProgetto.mutate(data.id)}
                okText="Chiudi progetto"
                cancelText="Annulla"
                okButtonProps={{ danger: true }}
              >
                <Button danger loading={chiudiProgetto.isPending}>
                  Chiudi progetto
                </Button>
              </Popconfirm>
            )}
          </RbacGuard>

          <RbacGuard azione="progetto:modifica">
            {!eBozza && (
              <Button icon={<EditOutlined />} onClick={() => setDrawerAperto(true)}>
                Modifica progetto
              </Button>
            )}
          </RbacGuard>

          <RbacGuard azione="progetto:attiva">
            {eBozza && (
              <Button
                type="primary"
                icon={<RocketOutlined />}
                onClick={apriModal}
              >
                Attiva progetto
              </Button>
            )}
          </RbacGuard>

          {puoGenerareReport && (
            <Dropdown
              menu={{
                items: [
                  { key: 'pdf', label: 'Scarica PDF', icon: <FilePdfOutlined /> },
                  { key: 'xlsx', label: 'Scarica Excel', icon: <FileExcelOutlined /> },
                ],
                onClick: ({ key }) => downloadReport(key as 'pdf' | 'xlsx'),
              }}
            >
              <Button icon={<DownloadOutlined />}>Genera Report</Button>
            </Dropdown>
          )}
        </Space>
        <div style={{ marginTop: 4 }}>
          <Text>{data.titolo}</Text>
        </div>
        <Space style={{ marginTop: 6 }} size={24}>
          {data.pi_nome && (
            <Text style={{ fontSize: 13 }}>
              <Text type="secondary">PI: </Text>
              <Text strong>{data.pi_nome}</Text>
            </Text>
          )}
          {data.amministrativo_nome && (
            <Text style={{ fontSize: 13 }}>
              <Text type="secondary">Amministrativo: </Text>
              <Text strong>{data.amministrativo_nome}</Text>
            </Text>
          )}
        </Space>
      </div>

      <Tabs
        defaultActiveKey="gantt"
        items={[
          { key: 'gantt', label: 'Struttura / Gantt', children: <TabGantt progettoId={id!} /> },
          { key: 'budget', label: 'Budget', children: <TabBudget progettoId={id!} /> },
          { key: 'sal', label: 'SAL', children: <TabSal progettoId={id!} stato={data.stato} /> },
          { key: 'personale', label: 'Personale', children: <TabPersonale progettoId={id!} /> },
          { key: 'documenti', label: 'Documenti', children: <TabDocumenti progettoId={id!} piId={data.pi_id ?? null} /> },
          { key: 'timesheet', label: 'Timesheet', children: <TabTimesheet progettoId={id!} stato={data.stato} /> },
          { key: 'spese', label: 'Spese', children: <TabSpese progettoId={id!} stato={data.stato} /> },
          { key: 'impegni', label: 'Impegni', children: <TabImpegni progettoId={id!} stato={data.stato} /> },
          { key: 'partner', label: 'Partner', children: <TabPartner progettoId={id!} /> },
        ]}
      />

      <ModificaProgettoDrawer
        progettoId={id!}
        aperto={drawerAperto}
        onChiudi={() => setDrawerAperto(false)}
      />

      <Modal
        title="Attiva progetto"
        open={modalAperta}
        onCancel={() => setModalAperta(false)}
        onOk={handleConfermaAttivazione}
        okText="Attiva"
        cancelText="Annulla"
        okButtonProps={{
          loading: attivaProgetto.isPending,
          icon: <RocketOutlined />,
        }}
        width={480}
      >
        {erroriPreAttivazione.length === 0 ? (
          <>
            <p>
              Stai per attivare il progetto{' '}
              <strong>{data.acronimo || data.codice}</strong>.
            </p>
            <p>
              Una volta attivo sara visibile a tutti gli utenti e sara possibile
              inserire timesheet e spese.
            </p>
            <p>Vuoi procedere?</p>
          </>
        ) : (
          <>
            <Alert
              type="error"
              message="Il progetto non puo essere attivato"
              description="Risolvi i seguenti problemi prima di procedere:"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <List
              size="small"
              dataSource={erroriPreAttivazione}
              renderItem={(item) => (
                <List.Item style={{ paddingLeft: 0, borderBottom: 'none' }}>
                  <Text type="danger">• {item}</Text>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
