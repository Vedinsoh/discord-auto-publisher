export default async (filePath: string) => {
  return (await import(filePath))?.default;
};
