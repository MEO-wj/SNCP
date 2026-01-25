export type Palette = {
  surface: string;
  surfaceWarm: string;
  orange500: string;
  green500: string;
  yellow500: string;
  blue500: string;
  gold50: string;
  gold100: string;
  cardTint: string;
  gold200: string;
  gold300: string;
  gold400: string;
  gold500: string;
  gold600: string;
  warm100: string;
  rose100: string;
  imperial50: string;
  imperial100: string;
  imperial400: string;
  imperial500: string;
  imperial600: string;
  stone900: string;
  stone850: string;
  stone800: string;
  stone700: string;
  stone600: string;
  stone500: string;
  stone400: string;
  stone300: string;
  stone200: string;
  stone100: string;
  white: string;
};

export const lightColors: Palette = {
  surface: '#FFF7F0',
  surfaceWarm: '#FFF1E3',
  orange500: '#FF8C42',
  green500: '#4CAF50',
  yellow500: '#FFD166',
  blue500: '#6A8EAE',
  gold50: '#FFF5E8',
  gold100: '#FFE6CF',
  cardTint: '#FFF2E6',
  gold200: '#FFD3A8',
  gold300: '#FFB87A',
  gold400: '#FF9A57',
  gold500: '#FF8C42',
  gold600: '#E36F24',
  warm100: '#FFE9D6',
  rose100: '#FFE1E1',
  imperial50: '#FFE4E9',
  imperial100: '#FFC9D5',
  imperial400: '#F36A8B',
  imperial500: '#EF476F',
  imperial600: '#D9345B',
  stone900: '#1E1B18',
  stone850: '#2A2623',
  stone800: '#3A3330',
  stone700: '#514A46',
  stone600: '#6A625D',
  stone500: '#827A75',
  stone400: '#9E9792',
  stone300: '#C9C3BE',
  stone200: '#E7E2DD',
  stone100: '#F3EFEB',
  white: '#FFFFFF',
};

export const darkColors: Palette = {
  surface: '#171614',
  surfaceWarm: '#1D1916',
  orange500: '#FF8C42',
  green500: '#69C56C',
  yellow500: '#FFD166',
  blue500: '#7FA6C2',
  gold50: '#2B2218',
  gold100: '#3A2C1C',
  cardTint: '#221D19',
  gold200: '#563924',
  gold300: '#FFB87A',
  gold400: '#FF9A57',
  gold500: '#FF8C42',
  gold600: '#E36F24',
  warm100: '#2B211A',
  rose100: '#2D1B1C',
  imperial50: '#2B151B',
  imperial100: '#3C1E26',
  imperial400: '#F36A8B',
  imperial500: '#EF476F',
  imperial600: '#FF8EA8',
  stone900: '#F6F2EE',
  stone850: '#E8E2DB',
  stone800: '#D7D0C8',
  stone700: '#BDB5AE',
  stone600: '#A39B94',
  stone500: '#8A827C',
  stone400: '#6F6863',
  stone300: '#514B47',
  stone200: '#332E2B',
  stone100: '#24201E',
  white: '#141312',
};

export function getPalette(colorScheme: 'light' | 'dark' | null | undefined): Palette {
  return colorScheme === 'dark' ? darkColors : lightColors;
}

// Backwards compatible: legacy code assumes this is the light palette.
export const colors = lightColors;
