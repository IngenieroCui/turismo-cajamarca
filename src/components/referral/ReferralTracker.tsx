import { useEffect } from 'react';
import { captureReferralFromUrl } from '../../services/referralService';
import { usePlatformConfig } from '../../context/usePlatformConfig';

const ReferralTracker: React.FC = () => {
  const referralsEnabled = usePlatformConfig((state) => state.referralsEnabled);
  useEffect(() => {
    if (referralsEnabled) void captureReferralFromUrl();
  }, [referralsEnabled]);
  return null;
};

export default ReferralTracker;
