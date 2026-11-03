// Las pantallas de iPhone con iOS 16.4 o más (lo que instala una web como app),
// en vertical: ancho y alto en puntos y densidad. Para cada una hay una imagen
// de arranque crema lisa en public/splash/, que hace `node
// scripts/splash-images.mjs`, y su <link rel="apple-touch-startup-image"> sale
// de aquí (layout.tsx · appleWebApp). Sin ellas, el iPhone arranca la app en
// una pantalla lisa de otro color antes del relevo de LaunchSplash.
// Sin imports a propósito: el script la lee tal cual con Node.

export const LAUNCH_BACKGROUND = "#FBF7EE"; // background_color del manifiesto

export const IPHONE_SCREENS = [
  { width: 375, height: 667, ratio: 2 }, // 8, SE 2.ª y 3.ª
  { width: 414, height: 736, ratio: 3 }, // 8 Plus
  { width: 375, height: 812, ratio: 3 }, // X, XS, 11 Pro, 12 y 13 mini
  { width: 414, height: 896, ratio: 2 }, // XR, 11
  { width: 414, height: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { width: 390, height: 844, ratio: 3 }, // 12, 13, 14, 16e
  { width: 428, height: 926, ratio: 3 }, // 12 y 13 Pro Max, 14 Plus
  { width: 393, height: 852, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 430, height: 932, ratio: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { width: 402, height: 874, ratio: 3 }, // 16 Pro, 17, 17 Pro
  { width: 420, height: 912, ratio: 3 }, // Air
  { width: 440, height: 956, ratio: 3 }, // 16 Pro Max, 17 Pro Max
] as const;

export const launchImagePath = ({ width, height, ratio }: (typeof IPHONE_SCREENS)[number]) =>
  `/splash/iphone-${width * ratio}x${height * ratio}.png`;
