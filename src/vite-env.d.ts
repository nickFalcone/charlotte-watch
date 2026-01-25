/// <reference types="vite/client" />

// SVG imports (as URL for use with img tags)
declare module '*.svg' {
  const content: string;
  export default content;
}
