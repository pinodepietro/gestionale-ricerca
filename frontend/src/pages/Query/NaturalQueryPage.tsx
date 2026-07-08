import { useState } from 'react';
import {
  Input,
  Button,
  Card,
  Table,
  Spin,
  message,
  Select,
  Space,
  Tooltip,
  Collapse,
  Empty,
  Alert,
} from 'antd';
import {
  SendOutlined,
  DownloadOutlined,
  CodeOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../api/client';

export function NaturalQueryPage() {
  const [domanda, setDomanda] = useState('');
  const [risultati, setRisultati] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState('');
  const [narrativa, setNarrativa] = useState('');
  const [formato, setFormato] = useState('json');
  const [conteggio, setConteggio] = useState(0);

  const handleQuery = async () => {
    if (!domanda.trim()) {
      message.warning('Inserisci una domanda');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/query/naturale', {
        domanda,
        formato,
      });

      if (formato === 'json') {
        if (response.data.error) {
          message.error(response.data.error);
        } else {
          setRisultati(response.data.risultati || []);
          setSql(response.data.sql_generato);
          setNarrativa(response.data.narrativa);
          setConteggio(response.data.conteggio);
          message.success(`${response.data.conteggio} risultati trovati`);
        }
      } else {
        // Download file
        const blob = new Blob([response.data], {
          type:
            formato === 'excel'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : formato === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `query_${new Date().getTime()}.${formato === 'excel' ? 'xlsx' : formato === 'pdf' ? 'pdf' : 'docx'}`;
        link.click();
        message.success(`Report ${formato.toUpperCase()} generato e scaricato`);
      }
    } catch (error: any) {
      message.error(
        error.response?.data?.detail || 'Errore nell\'esecuzione della query'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = risultati.length
    ? Object.keys(risultati[0]).map((key) => ({
        title: key,
        dataIndex: key,
        key,
        width: 150,
        render: (value: any) => {
          if (value === null || value === undefined) return '—';
          if (typeof value === 'boolean') return value ? '✓' : '✗';
          const str = String(value);
          return str.length > 100 ? str.substring(0, 100) + '...' : str;
        },
      }))
    : [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🤖 Interrogazione Database in Linguaggio Naturale</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Fai domande sui dati del sistema usando il linguaggio naturale. Il
        sistema genererà automaticamente query SQL e fornirà risultati con
        analisi.
      </p>

      {/* Input Area */}
      <Card
        style={{ marginBottom: '24px' }}
        title="📝 Formulazione della Domanda"
      >
        <Space style={{ width: '100%' }} direction="vertical" size="large">
          <Input.TextArea
            rows={4}
            placeholder="Es: Quante ore ha lavorato Giuseppe nel 2026? / Mostra tutte le spese per categoria nel progetto ACME / Qual è il budget rimasto per WP1?"
            value={domanda}
            onChange={(e) => setDomanda(e.target.value)}
            onPressEnter={(e) => {
              if (e.ctrlKey || e.metaKey) handleQuery();
            }}
          />

          <div
            style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
          >
            <Select
              value={formato}
              onChange={setFormato}
              style={{ width: '180px' }}
              options={[
                { label: '📊 JSON (Visualizza)', value: 'json' },
                { label: '📈 Excel', value: 'excel' },
                { label: '📄 PDF', value: 'pdf' },
                { label: '📝 Word', value: 'word' },
              ]}
            />

            <Button
              type="primary"
              size="large"
              onClick={handleQuery}
              icon={loading ? <LoadingOutlined /> : <SendOutlined />}
              loading={loading}
            >
              {loading ? 'Elaborazione...' : 'Interroga'}
            </Button>

            <Tooltip title="Premi Ctrl+Invio per inviare">
              <span style={{ color: '#999', fontSize: '12px' }}>
                Ctrl+Invio
              </span>
            </Tooltip>
          </div>

          <Alert
            message="ℹ️ Suggerimenti per domande efficaci"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Sii specifico: "ore di Giuseppe in progetto ACME nel Q1"</li>
                <li>Includi date o periodi: "rimborsi dal 2026-01-01"</li>
                <li>Chiedi aggregazioni: "total spese per categoria"</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* SQL Generato */}
      {sql && (
        <Collapse
          items={[
            {
              key: '1',
              label: (
                <span>
                  <CodeOutlined /> SQL Generato (clicca per vedere)
                </span>
              ),
              children: (
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    overflow: 'auto',
                  }}
                >
                  <code>{sql}</code>
                </pre>
              ),
            },
          ]}
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Narrativa/Analisi */}
      {narrativa && (
        <Card
          title="💡 Analisi e Riepilogo"
          style={{
            marginBottom: '24px',
            background: '#f0f5ff',
            borderColor: '#1E5AA0',
          }}
        >
          <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            {narrativa}
          </p>
        </Card>
      )}

      {/* Dati Tabella */}
      {risultati.length > 0 && (
        <Card title={`📊 Risultati (${conteggio} righe)`}>
          <Table
            dataSource={risultati.map((r, i) => ({ ...r, key: i }))}
            columns={columns}
            pagination={{
              pageSize: 10,
              total: risultati.length,
              showTotal: (total) => `${total} righe totali`,
            }}
            scroll={{ x: true }}
            size="small"
            bordered
          />
        </Card>
      )}

      {/* Empty State */}
      {!loading && conteggio === 0 && sql && (
        <Card>
          <Empty
            description="Nessun risultato trovato"
            style={{ padding: '40px 0' }}
          />
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} />} />
          <p style={{ marginTop: '16px', color: '#999' }}>
            Elaborazione della query in corso...
          </p>
        </Card>
      )}
    </div>
  );
}
