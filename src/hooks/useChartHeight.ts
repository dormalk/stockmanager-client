import { useMediaQuery } from './useMediaQuery'

/**
 * Returns a responsive base chart height.
 * Each chart adds its own extra pixels for sub-panels on top of this.
 */
export function useChartHeight(desktopHeight = 400, tabletHeight = 320, mobileHeight = 220): number {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(max-width: 1023px)')
  if (isMobile) return mobileHeight
  if (isTablet) return tabletHeight
  return desktopHeight
}
