declare module '*.eml?raw' {
  const content: string; // Or a more specific type if you know it
  export default content;
}

declare module '*.txt' {
  const content: string; // Or a more specific type if you know it
  export default content;
}
