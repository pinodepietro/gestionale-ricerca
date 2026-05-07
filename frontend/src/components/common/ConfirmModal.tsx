// frontend/src/components/common/ConfirmModal.tsx
// Modal di conferma generico riutilizzabile per azioni distruttive o irreversibili.
import { Modal } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  content: ReactNode;
  okText?: string;
  okDanger?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  content,
  okText = 'Conferma',
  okDanger = false,
  confirmLoading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText="Annulla"
      okButtonProps={{ danger: okDanger, loading: confirmLoading }}
      onOk={onConfirm}
      onCancel={onCancel}
      maskClosable={false}
    >
      {content}
    </Modal>
  );
}
