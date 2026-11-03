import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { sl } from '@/constants/i18n';

describe('OfflineBanner', () => {
  it('renders nothing when visible=false', () => {
    const { toJSON } = render(<OfflineBanner visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the offline copy when visible=true', () => {
    const { getByText } = render(<OfflineBanner visible={true} />);
    expect(getByText(sl.common.noInternet)).toBeTruthy();
  });
});
