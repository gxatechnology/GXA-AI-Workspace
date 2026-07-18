import React from 'react';
import MediaStudio from './MediaStudio';
import type { WorkspaceId } from '../../types';

export default function OCR(props: {
  currentUser?: any;
  onOpenUpgradeModal: () => void;
  onSelectWorkspace: (id: WorkspaceId) => void;
  setSharedText: (text: string) => void;
  initialText?: string;
}) {
  return <MediaStudio {...props} initialSection="OCR" />;
}
