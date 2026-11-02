declare module 'react-brazil-map' {
  import React from 'react';

  export interface MapBrazilProps {
    width?: number | string;
    height?: number | string;
    fill?: string;
    bg?: string;
    colorLabel?: string;
    colorStroke?: string;
    onChange?: (district: string) => void;
  }

  export const MapBrazil: React.FC<MapBrazilProps>;
}
