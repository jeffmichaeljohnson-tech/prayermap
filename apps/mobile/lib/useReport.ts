/**
 * useReport - Hook for reporting content
 *
 * Provides state management for the ReportBottomSheet component.
 * Usage:
 *   const { showReportSheet, reportState, closeReportSheet } = useReport();
 *
 *   // To open the report sheet:
 *   showReportSheet('prayer', prayerId);
 *
 *   // In JSX:
 *   <ReportBottomSheet
 *     visible={reportState.visible}
 *     targetType={reportState.targetType}
 *     targetId={reportState.targetId}
 *     onClose={closeReportSheet}
 *   />
 */

import { useState, useCallback } from 'react';

type TargetType = 'prayer' | 'user' | 'response';

interface ReportState {
  visible: boolean;
  targetType: TargetType;
  targetId: string;
}

const initialState: ReportState = {
  visible: false,
  targetType: 'prayer',
  targetId: '',
};

export function useReport() {
  const [reportState, setReportState] = useState<ReportState>(initialState);

  const showReportSheet = useCallback((targetType: TargetType, targetId: string) => {
    setReportState({
      visible: true,
      targetType,
      targetId,
    });
  }, []);

  const closeReportSheet = useCallback(() => {
    setReportState(initialState);
  }, []);

  return {
    reportState,
    showReportSheet,
    closeReportSheet,
  };
}

export default useReport;
