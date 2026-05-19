export {
  colors,
  colorsLight,
  withAlpha,
  setActivePalette,
  getActivePalette,
} from './colors';
export { colorsDark } from './colors-dark';
export { typography } from './typography';
export { spacing, radius, shadows, floatingTabBar } from './spacing';

export function getPalette(scheme) {
  return scheme === 'dark'
    ? require('./colors-dark').colorsDark
    : require('./colors').colorsLight;
}
